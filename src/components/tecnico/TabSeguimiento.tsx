"use client";

import React, { useState, useEffect } from "react";
import { obtenerHistorial, getMateriales, getDispositivos, eliminarDeHistorial } from "@/lib/store";
import { obtenerInformesPorTecnico, getDocument } from "@/lib/firestore-service";
import { obtenerSesion } from "@/lib/auth-service";
import { ESTADO_COLORES } from "@/lib/config";
import type { DocumentData } from "firebase/firestore";
import { exportarPDFInforme } from "@/lib/pdf-export";

interface TabSeguimientoProps {
  onEdit: (id: string) => void;
  tecnicoNombre?: string;
  showAlert?: (msg: string) => void;
}

export function TabSeguimiento({ onEdit, tecnicoNombre, showAlert }: TabSeguimientoProps) {
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  const [descargandoPdf, setDescargandoPdf] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      const localHist = obtenerHistorial();
      
      let nubeHist: any[] = [];
      if (tecnicoNombre) {
        const informesData = await obtenerInformesPorTecnico(tecnicoNombre);
        nubeHist = Object.entries(informesData).map(([id, doc]) => ({
          fecha: doc.metadatos?.fecha || "",
          agencia: doc.metadatos?.agencia || "Desconocida",
          estado: doc.estado || "Pendiente",
          id_nube: id,
          motivo_eliminacion: doc.motivo_eliminacion || ""
        }));
      }

      // Mezclar local y nube
      // Preferimos los de la nube si tienen id_nube. Los locales sin id_nube (offline) se mantienen.
      const mapNube = new Map(nubeHist.map(h => [h.id_nube, h]));
      
      const mixto = [];
      for (const h of localHist) {
        if (h.id_nube && mapNube.has(h.id_nube)) {
          // Si está en la nube, se ignora aquí porque lo agregaremos de la nube
        } else {
          mixto.push(h); // Pendientes o no sincronizados
        }
      }
      
      // Agregar todos los de la nube
      for (const h of nubeHist) {
        mixto.push(h);
      }

      // Ordenar por fecha_raw si es posible, o al menos mantener orden
      // Ya que no tenemos timestamp exacto en la lista, invertimos al final
      
      // Verificar eliminados
      const notificadosStr = localStorage.getItem("app_eliminados_vistos") || "[]";
      const notificados = new Set<string>(JSON.parse(notificadosStr));
      
      const recienEliminados = mixto.filter(h => h.estado === "Eliminado" && h.id_nube && !notificados.has(h.id_nube));
      
      if (recienEliminados.length > 0 && showAlert) {
        const mensajes = recienEliminados.map(h => `- ${h.agencia}: ${h.motivo_eliminacion}`).join("\n");
        showAlert(`Algunos informes fueron eliminados por el supervisor:\n${mensajes}`);
        
        recienEliminados.forEach(h => notificados.add(h.id_nube));
        localStorage.setItem("app_eliminados_vistos", JSON.stringify(Array.from(notificados)));
      }

      // Filtrar los eliminados para que no aparezcan en la tabla
      const finales = mixto.filter(h => h.estado !== "Eliminado");
      
      // Ordenar cronológicamente descendente (DD/MM/YYYY)
      finales.sort((a, b) => {
        const parseFecha = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return parseInt(`${year}${month}${day}`, 10);
          }
          return 0;
        };
        return parseFecha(b.fecha) - parseFecha(a.fecha);
      });
      
      // Límite visual de 50 registros
      setHistorialCompleto(finales.slice(0, 50));
      setCargando(false);
    }
    
    cargarDatos();
  }, [tecnicoNombre, showAlert]);

  async function handleDescargarHistorial(idNube: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDescargandoPdf(idNube);
    try {
      const doc = await getDocument("informes", idNube);
      if (doc) {
        exportarPDFInforme(doc, getMateriales(), getDispositivos());
      } else {
        if (showAlert) showAlert("El informe fue eliminado remotamente o no tiene datos. Removiendo del historial.");
        else alert("El informe fue eliminado remotamente o no tiene datos. Removiendo del historial.");
        
        eliminarDeHistorial(idNube);
        setHistorialCompleto(prev => prev.filter(h => h.id_nube !== idNube));
      }
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      if (showAlert) showAlert("Error al descargar el PDF. Removiendo del historial temporalmente.");
      else alert("Error al descargar el PDF.");
      eliminarDeHistorial(idNube);
      setHistorialCompleto(prev => prev.filter(h => h.id_nube !== idNube));
    }
    setDescargandoPdf(null);
  }


  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", paddingBottom: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16, paddingRight: 4 }}>
        <h3 style={{ marginBottom: "var(--space-md)", fontSize: "var(--font-size-md)" }}>📡 Historial de envíos</h3>
            {cargando ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Cargando historial...</p>
            ) : historialCompleto.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Sin envíos registrados</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Agencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {historialCompleto.map((h, i) => (
                      <tr key={i}>
                        <td>{h.fecha}</td><td>{h.agencia}</td><td>{h.estado}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {h.id_nube && (
                              <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => onEdit(h.id_nube!)}>
                                ✏️ Editar
                              </button>
                            )}
                            {h.id_nube && (
                              <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12 }} 
                                onClick={(e) => handleDescargarHistorial(h.id_nube!, e)}
                                disabled={descargandoPdf === h.id_nube}>
                                {descargandoPdf === h.id_nube ? "⏳..." : "📄 PDF"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </div>
  );
}
