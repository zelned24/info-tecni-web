"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, type Categoria } from "@/lib/config";
import {
  obtenerCatalogo,
  obtenerListaAgencias,
  obtenerAgenciasCompletas,
  exportarInforme,
  getDocument,
} from "@/lib/firestore-service";
import { obtenerSesion, logout } from "@/lib/auth-service";
import { esModoDemo } from "@/lib/demo-data";
import {
  getReporteActual,
  setMateriales,
  setDispositivos,
  getMateriales,
  getDispositivos,
  getListaAgencias,
  setListaAgencias,
  getIdNubeActual,
  setIdNubeActual,
  restaurarReporteLocal,
  obtenerHistorial,
  agregarHistorial,
  agregarAColaOffline,
  obtenerColaOffline,
  limpiarColaOffline,
  limpiarReporte,
  cargarReporteDesdeData,
  eliminarDeHistorial,
} from "@/lib/store";
import type { Registro } from "@/lib/report-engine";
import { exportarPDFInforme } from "@/lib/pdf-export";
import { Modal } from "@/components/Modal";

// Sub-componentes extraídos
import { TabIngreso } from "@/components/tecnico/TabIngreso";
import { TabResumen } from "@/components/tecnico/TabResumen";
import { TabSeguimiento } from "@/components/tecnico/TabSeguimiento";
import { hapticImpact, hapticNotification, hapticSelection } from "@/lib/haptics";
import { NotificationType, ImpactStyle } from "@capacitor/haptics";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";

type TabActiva = Categoria | "Resumen" | "Seguimiento";

export default function TecnicoPage() {
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState<TabActiva>("Correctivo");
  const [tecnico, setTecnico] = useState("");
  const [agencia, setAgencia] = useState("");
  const [fecha, setFecha] = useState("");
  const [agenciasFiltradas, setAgenciasFiltradas] = useState<string[]>([]);
  const [showAgDropdown, setShowAgDropdown] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [sesion, setSesion] = useState<{ nombre: string; rol: string; uid: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const [modal, setModal] = useState<{isOpen: boolean, type: "alert"|"confirm"|"danger"|"prompt", title: string, msg: React.ReactNode, inputVal?: string, action: (val?: string) => void} | null>(null);
  const showAlert = useCallback((msg: React.ReactNode) => setModal({isOpen: true, type: "alert", title: "Aviso", msg, action: () => setModal(null)}), []);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s || !["tecnico", "supervisor", "admin"].includes(s.rol)) {
      router.push("/"); return;
    }
    setSesion(s);
    setTecnico(s.nombre);
    setDarkMode(localStorage.getItem("app_theme") === "dark");
    setIsDemo(esModoDemo());
    setFecha(new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }));
    
    async function inicializar() {
      restaurarReporteLocal();
      setCargando(true);
      try {
        const [mats, disps, ags] = await Promise.all([
          obtenerCatalogo("materiales"),
          obtenerCatalogo("dispositivos"),
          obtenerAgenciasCompletas(),
        ]);

        if (mats && Object.keys(mats).length > 0) setMateriales(mats as Record<string, { nombre: string; unidad: string }>);
        if (disps && Object.keys(disps).length > 0) setDispositivos(disps as Record<string, { nombre: string; materiales_vinculados?: string[] }>);
        if (ags.length > 0) setListaAgencias(ags);

      } catch (e) {
        console.error("[Tecnico] Error inicializando:", e);
      }
      setCargando(false);
      
      // Intentar sincronizar al cargar si hay conexión
      if (navigator.onLine) {
        syncOffline();
      }
    }
    inicializar();
    
    // Escuchar cuando vuelva el internet
    window.addEventListener('online', syncOffline);
    return () => {
      window.removeEventListener('online', syncOffline);
    };
  }, [router]);

  async function syncOffline() {
    const queue = obtenerColaOffline();
    if (queue.length === 0) return;
    
    let exito = 0;
    const nuevaCola = [];
    
    for (const item of queue) {
      if (item.tipo === "informe") {
        const { agencia, tecnico, fecha, reporte } = item.datos as any;
        const res = await exportarInforme(agencia, tecnico, fecha, reporte, null, "Sincronización Automática");
        if (res.ok && res.id) {
          agregarHistorial({ fecha, agencia, estado: "Enviado ☁️", id_nube: res.id });
          exito++;
        } else {
          nuevaCola.push(item);
        }
      }
    }
    
    if (exito > 0) {
      if (nuevaCola.length === 0) {
        limpiarColaOffline();
      } else {
        localStorage.setItem("app_offline_queue", JSON.stringify(nuevaCola));
      }
      // Use alert directly since showAlert might conflict with multiple states during load
      alert(`✅ Sincronización exitosa: Se enviaron ${exito} informes que estaban pendientes sin conexión.`);
    }
  }

  function filtrarAgencias(texto: string) {
    setAgencia(texto);
    const all = getListaAgencias();
    if (!texto.trim()) { setAgenciasFiltradas(all); setShowAgDropdown(true); return; }
    setAgenciasFiltradas(all.filter((a) => a.toLowerCase().includes(texto.toLowerCase())));
    setShowAgDropdown(true);
  }

  async function enviarInforme(descripcionCambio: string = "Envío inicial") {
    const ag = agencia.trim().toUpperCase();
    const tc = tecnico.trim();
    if (!ag || !tc) { showAlert("Completa Técnico y Agencia."); return; }
    const reporte = getReporteActual();
    if (!Object.values(reporte).some((r) => r.length > 0)) { showAlert("El informe está vacío."); return; }

    setEnviando(true);
    try {
      const result = await exportarInforme(ag, tc, fecha, reporte as unknown as Record<string, unknown[]>, getIdNubeActual(), descripcionCambio);
      if (result.ok && result.id) {
        setIdNubeActual(result.id);
        agregarHistorial({ fecha, agencia: ag, estado: "Enviado ☁️", id_nube: result.id });
        showAlert(getIdNubeActual() ? "¡Informe editado enviado a la nube! ☁️" : "¡Informe enviado a la nube! ☁️");
        limpiarReporte();
        setAgencia("");
        forceUpdate();
      } else {
        throw new Error("Error Firestore");
      }
    } catch {
      agregarAColaOffline({ tipo: "informe", datos: { agencia: ag, tecnico: tc, fecha, reporte }, timestamp: new Date().toISOString() });
      agregarHistorial({ fecha, agencia: ag, estado: "Pendiente (Sin Internet) ⚠️" });
      showAlert("Sin internet. Guardado localmente.\nVe a 'Seguimiento' cuando tengas señal.");
      limpiarReporte();
      setAgencia("");
      forceUpdate();
    }
    setEnviando(false);
  }

  async function editarInformeEnviado(idNube: string) {
    setCargando(true);
    try {
      const doc = await getDocument("informes", idNube);
      if (doc && doc.datos) {
        cargarReporteDesdeData(doc.datos as Record<string, Registro[]>);
        setIdNubeActual(idNube);
        if (doc.metadatos?.agencia) setAgencia(doc.metadatos.agencia);
        setTabActiva("Resumen");
        forceUpdate();
      } else {
        showAlert("El informe fue eliminado remotamente o está vacío. Removiendo del historial.");
        eliminarDeHistorial(idNube);
        forceUpdate(); // Re-render to refresh TabSeguimiento
      }
    } catch (e) {
      console.error(e);
      showAlert("Error al cargar el informe de la nube. Removiendo del historial temporalmente.");
      eliminarDeHistorial(idNube);
      forceUpdate();
    }
    setCargando(false);
  }

  function handleDescargarBorrador() {
    const reporte = getReporteActual();
    if (!Object.values(reporte).some((r) => r.length > 0)) {
      showAlert("El informe está vacío.");
      return;
    }
    const docData = {
      datos: reporte,
      metadatos: {
        agencia: agencia || "Borrador",
        tecnico: tecnico || "Desconocido",
        fecha: fecha || ""
      },
      estado: "Borrador"
    };
    try {
      exportarPDFInforme(docData, getMateriales(), getDispositivos());
    } catch (e) {
      console.error(e);
      showAlert("Error al generar el PDF.");
    }
  }

  if (cargando) {
    return (
      <div className="page-container" style={{ padding: "var(--space-md)" }}>
        <Skeleton variant="text" width="60%" height="2rem" />
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton variant="rectangular" width="100%" height="4rem" />
          <Skeleton variant="rectangular" width="100%" height="4rem" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const isCategoria = CATEGORIAS.includes(tabActiva as Categoria);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      {/* Top Navbar */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "6px 12px", background: "var(--bg-card)", 
        borderBottom: "1px solid var(--border-color)",
        gap: 8,
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(p => !p); }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>👨‍🔧</span>
            <h1 className="mobile-hide" style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-primary)", whiteSpace: "nowrap", userSelect: "none" }}>
              Módulo Técnico — {tecnico} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </h1>
            <span className="desktop-hide" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "none" }}>
              {tecnico} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </span>
            {isDemo && (
              <span style={{
                background: "rgba(255, 152, 0, 0.15)",
                color: "#e65100",
                border: "1px solid rgba(255, 152, 0, 0.4)",
                padding: "2px 6px",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.5px"
              }}>
                DEMO
              </span>
            )}
          </div>

          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }} />
              <div className="desktop-hide" style={{ position: "absolute", top: "100%", left: 0, marginTop: 12, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", minWidth: 180, zIndex: 100, padding: 8, gap: 4 }}>
                {sesion?.rol === "admin" && (
                  <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/admin")}>⚙️ Ir a Admin</button>
                )}
                {(sesion?.rol === "supervisor" || sesion?.rol === "admin") && (
                  <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/supervisor")}>📊 Ir a Supervisor</button>
                )}
                <div style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--color-danger)", cursor: "pointer", borderRadius: 6 }} onClick={async () => { await logout(); router.push("/"); }}>🚪 Cerrar sesión</button>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div className="mobile-hide" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
            {sesion?.rol === "admin" && (
              <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-primary)", color: "var(--color-primary)", whiteSpace: "nowrap" }} onClick={() => router.push("/admin")}>
                ⚙️ Admin
              </button>
            )}
            {(sesion?.rol === "supervisor" || sesion?.rol === "admin") && (
              <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-info)", color: "var(--color-info)", whiteSpace: "nowrap" }} onClick={() => router.push("/supervisor")}>
                📊 Supervisor
              </button>
            )}
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-danger)", color: "var(--color-danger)", whiteSpace: "nowrap" }} onClick={async () => { await logout(); router.push("/"); }}>
              Cerrar sesión
            </button>
          </div>
          <button className="btn btn-outline" style={{ padding: "4px", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--border-color)", color: "var(--text-primary)" }} onClick={() => {
            const next = !darkMode; setDarkMode(next);
            localStorage.setItem("app_theme", next ? "dark" : "light");
            document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
            hapticImpact(ImpactStyle.Light);
          }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Context Row */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: "var(--bg-card)", alignItems: "center", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
        {/* Técnico — solo en desktop */}
        <div className="mobile-hide" style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-input)", padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
          <span>👨‍🔧</span>
          <input className="input" style={{ border: "none", background: "transparent", padding: "4px 0", boxShadow: "none" }}
            value={tecnico} readOnly />
        </div>
        {/* Agencia */}
        <div style={{ flex: 1, minWidth: 120, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-input)", padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border-color)", position: "relative" }}>
          <span>🏢</span>
          <input className="input" style={{ border: "none", background: "transparent", padding: "4px 0", boxShadow: "none", fontSize: 13 }}
            placeholder="Agencia..." value={agencia} onChange={(e) => filtrarAgencias(e.target.value)}
            onFocus={() => filtrarAgencias(agencia)} onBlur={() => setTimeout(() => setShowAgDropdown(false), 200)} />
          {showAgDropdown && agenciasFiltradas.length > 0 && (
            <div className="card" style={{ position: "absolute", top: 40, left: 0, right: 0, zIndex: 100, maxHeight: 300, overflowY: "auto", padding: 0 }}>
              {agenciasFiltradas.slice(0, 30).map((a) => (
                <div key={a} style={{ padding: "8px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", fontSize: 13 }} 
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                  setAgencia(a);
                  setShowAgDropdown(false);
                  hapticSelection();
                }}>{a}</div>
              ))}
            </div>
          )}
        </div>
        {/* Fecha — tamaño normal en desktop, compacta en mobile */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--color-primary)" }}>📅</span>
          {fecha}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "var(--bg-card)", padding: "0 24px", borderBottom: "1px solid var(--border-color)" }}>
        <div className="tabs" style={{ gap: 24, borderBottom: "none" }}>
          {[
            { id: "Correctivo", label: "Correctivo", icon: "🔧" },
            { id: "Instalaciones Nuevas", label: "Instalaciones", icon: "✨" },
            { id: "Recableados", label: "Recableados", icon: "🔌" },
            { id: "Resumen", label: "Resumen", icon: "📋" },
            { id: "Seguimiento", label: "Seguimiento", icon: "📡" }
          ].map((tab) => (
            <button key={tab.id} className="tab"
              style={{ fontSize: 12, padding: "8px 0", color: tabActiva === tab.id ? "var(--color-primary)" : "var(--text-muted)", fontWeight: tabActiva === tab.id ? 700 : 500 }}
              onClick={() => {
                if (tabActiva !== tab.id) {
                  setTabActiva(tab.id as TabActiva);
                  hapticSelection();
                  forceUpdate();
                }
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {isCategoria && (
          <TabIngreso
            categoria={tabActiva as Categoria}
            onUpdate={forceUpdate}
            showAlert={(msg: string) => showAlert(msg)}
          />
        )}
        {tabActiva === "Resumen" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <TabResumen onUpdate={forceUpdate} showAlert={(msg: string) => showAlert(msg)} onDescargarPDF={handleDescargarBorrador} />
          </div>
        )}
        {tabActiva === "Seguimiento" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <TabSeguimiento onEdit={editarInformeEnviado} tecnicoNombre={tecnico} showAlert={(msg: string) => showAlert(msg)} />
          </div>
        )}
      </main>

      {/* Footer Fijo de Acciones */}
      <div className="tecnico-footer-actions" style={{ padding: "10px 16px", background: "var(--bg-card)", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Botón Vaciar / Cancelar */}
        <button 
          className="btn"
          style={{ 
            padding: "10px 16px", borderRadius: 8,
            background: "var(--bg-secondary)", color: "var(--color-danger)", 
            border: "1px solid var(--border-color)", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8
          }}
          onClick={() => {
            setModal({
              isOpen: true, 
              type: "confirm", 
              title: getIdNubeActual() ? "Descartar cambios" : "Vaciar Todo", 
              msg: getIdNubeActual() ? "¿Seguro que deseas descartar los cambios y salir del modo de edición? El informe original se mantendrá intacto." : "¿Seguro que deseas vaciar TODOS los registros actuales en pantalla?", 
              action: () => {
                limpiarReporte(); 
                setAgencia(""); 
                forceUpdate(); 
                setModal(null);
              }
            });
          }}
        >
          {getIdNubeActual() ? "❌ Cancelar Edición" : "🗑️ Vaciar Todo"}
        </button>
        {/* Botón Enviar */}
        <button 
          className={`btn ${getIdNubeActual() ? "btn-primary" : "btn-success"}`} 
          style={{ 
            padding: "10px 24px", borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8
          }} 
          onClick={() => {
            if (getIdNubeActual()) {
              setModal({
                isOpen: true,
                type: "prompt",
                title: "Enviar editado",
                msg: "Describe brevemente los cambios realizados:",
                inputVal: "",
                action: (val?: string) => {
                  enviarInforme(val || "Edición sin detalle");
                  setModal(null);
                }
              });
            } else {
              enviarInforme();
            }
          }} 
          disabled={enviando}
        >
          {enviando ? "⏳ Enviando..." : (getIdNubeActual() ? "💾 Enviar Editado" : "🚀 Enviar Informe")}
        </button>
      </div>

      {/* Modals */}
      {modal && (
        <Modal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.msg}
          type={modal.type}
          inputValue={modal.inputVal}
          onInputChange={(val) => setModal({ ...modal, inputVal: val })}
          onConfirm={() => {
            if (modal.type === "prompt") modal.action(modal.inputVal);
            else modal.action();
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
