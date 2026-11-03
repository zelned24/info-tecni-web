"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  agregarSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
} from "@/lib/firestore-service";
import { getListaAgencias } from "@/lib/store";
import type { DocumentData } from "firebase/firestore";

interface SolicitudesTabProps {
  solicitudes: Record<string, DocumentData>;
  setSolicitudes: React.Dispatch<React.SetStateAction<Record<string, DocumentData>>>;
  agencias?: string[];
  tecnicos?: string[];
}

export function SolicitudesTab({ solicitudes, setSolicitudes, agencias = [], tecnicos = [] }: SolicitudesTabProps) {
  const [fecha, setFecha] = useState("");
  const [agSol, setAgSol] = useState("");
  const [ubi, setUbi] = useState("");
  const [tec, setTec] = useState("");
  const [desc, setDesc] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Dropdown agencias para nueva solicitud
  const [showAgDropdown, setShowAgDropdown] = useState(false);
  const [agenciasFiltradas, setAgenciasFiltradas] = useState<string[]>([]);

  // Estado para modal de edición
  const [editItem, setEditItem] = useState<{
    id: string;
    fecha: string;
    agencia: string;
    ubicacion: string;
    tecnico: string;
    descripcion: string;
    estado: string;
  } | null>(null);
  const [showEditAgDropdown, setShowEditAgDropdown] = useState(false);
  const [editAgFiltradas, setEditAgFiltradas] = useState<string[]>([]);

  const listaAg = agencias.length > 0 ? agencias : getListaAgencias();

  useEffect(() => {
    setFecha(new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }));
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function filtrarAgenciasNew(txt: string) {
    setAgSol(txt);
    if (!txt.trim()) {
      setAgenciasFiltradas(listaAg);
    } else {
      setAgenciasFiltradas(listaAg.filter(a => a.toLowerCase().includes(txt.toLowerCase())));
    }
    setShowAgDropdown(true);
  }

  function filtrarAgenciasEdit(txt: string) {
    if (!editItem) return;
    setEditItem({ ...editItem, agencia: txt });
    if (!txt.trim()) {
      setEditAgFiltradas(listaAg);
    } else {
      setEditAgFiltradas(listaAg.filter(a => a.toLowerCase().includes(txt.toLowerCase())));
    }
    setShowEditAgDropdown(true);
  }

  async function guardar() {
    if (!fecha || !agSol || !desc) { alert("Completa Fecha, Agencia y Descripción."); return; }
    const datos = { fecha, agencia: agSol.toUpperCase(), ubicacion: ubi, tecnico: tec, descripcion: desc, estado: "Pendiente" };
    const nid = await agregarSolicitud(datos);
    if (nid) {
      setSolicitudes((prev) => ({ ...prev, [nid]: datos }));
      setAgSol(""); setUbi(""); setTec(""); setDesc("");
      alert("Solicitud guardada.");
    }
  }

  async function cambiarEst(iid: string, nuevo: string) {
    await actualizarSolicitud(iid, { estado: nuevo });
    setSolicitudes((prev) => ({ ...prev, [iid]: { ...prev[iid], estado: nuevo } }));
  }

  async function borrarSol(iid: string) {
    const sol = solicitudes[iid];
    const nom = sol?.agencia ? `de ${sol.agencia}` : "";
    if (!confirm(`¿Estás seguro de eliminar la solicitud ${nom}?`)) return;

    const ok = await eliminarSolicitud(iid);
    if (ok) {
      setSolicitudes((prev) => {
        const cop = { ...prev };
        delete cop[iid];
        return cop;
      });
    } else {
      alert("❌ No se pudo eliminar la solicitud.");
    }
  }

  function abrirEdicion(iid: string) {
    const s = solicitudes[iid];
    if (!s) return;
    setEditItem({
      id: iid,
      fecha: s.fecha || "",
      agencia: s.agencia || "",
      ubicacion: s.ubicacion || "",
      tecnico: s.tecnico || "",
      descripcion: s.descripcion || "",
      estado: s.estado || "Pendiente",
    });
  }

  async function guardarEdicion() {
    if (!editItem) return;
    if (!editItem.fecha || !editItem.agencia || !editItem.descripcion) {
      alert("Completa Fecha, Agencia y Descripción.");
      return;
    }
    const datos = {
      fecha: editItem.fecha,
      agencia: editItem.agencia.toUpperCase(),
      ubicacion: editItem.ubicacion,
      tecnico: editItem.tecnico,
      descripcion: editItem.descripcion,
      estado: editItem.estado,
    };
    const ok = await actualizarSolicitud(editItem.id, datos);
    if (ok) {
      setSolicitudes((prev) => ({
        ...prev,
        [editItem.id]: { ...prev[editItem.id], ...datos },
      }));
      setEditItem(null);
    } else {
      alert("❌ No se pudieron guardar los cambios.");
    }
  }

  const estadoColor: Record<string, string> = {
    "Pendiente": "#F0A500",
    "En Proceso": "#2196F3",
    "Completado": "#4CAF50",
    "Rechazado": "#E53935",
  };

  return (
    <div className="animate-fade-in">
      <div className="card" style={{ marginBottom: "var(--space-md)", overflow: "visible" }}>
        <h3 style={{ fontSize: "var(--font-size-sm)", marginBottom: 12 }}>➕ Nueva Solicitud</h3>
        {/* Desktop: 3 cols | Mobile: 1 col */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
          <input className="input" placeholder="📅 Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          
          {/* Autocompletado de Agencia */}
          <div style={{ position: "relative" }}>
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder="🏢 Agencia..."
              value={agSol}
              onChange={(e) => filtrarAgenciasNew(e.target.value)}
              onFocus={() => {
                setAgenciasFiltradas(listaAg);
                setShowAgDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowAgDropdown(false), 200)}
            />
            {showAgDropdown && agenciasFiltradas.length > 0 && (
              <ul className="dropdown-list" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, maxHeight: 180, overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, listStyle: "none", margin: 0, padding: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                {agenciasFiltradas.slice(0, 15).map((a) => (
                  <li
                    key={a}
                    onClick={() => {
                      setAgSol(a);
                      setShowAgDropdown(false);
                    }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid var(--border-color)" }}
                  >
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input className="input" placeholder="📍 Ubicación" value={ubi} onChange={(e) => setUbi(e.target.value)} />
          
          {/* Selector de técnico o input */}
          {tecnicos.length > 0 ? (
            <select className="select" value={tec} onChange={(e) => setTec(e.target.value)}>
              <option value="">👨‍🔧 Seleccionar Técnico…</option>
              {tecnicos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <input className="input" placeholder="👨‍🔧 Técnico" value={tec} onChange={(e) => setTec(e.target.value)} />
          )}

          <input className="input" placeholder="📝 Descripción" value={desc} onChange={(e) => setDesc(e.target.value)} style={isMobile ? {} : { gridColumn: "span 2" }} />
        </div>
        <button className="btn btn-success" style={{ marginTop: 8, width: isMobile ? "100%" : "auto" }} onClick={guardar}>💾 Guardar</button>
      </div>

      {/* Desktop: tabla */}
      <div className="table-container mobile-hide">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Agencia</th>
              <th>Ubicación</th>
              <th>Técnico</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(solicitudes).map(([iid, s]) => (
              <tr key={iid}>
                <td>{s.fecha}</td>
                <td style={{ fontWeight: 600 }}>{s.agencia}</td>
                <td>{s.ubicacion || "—"}</td>
                <td>{s.tecnico || "—"}</td>
                <td>{s.descripcion}</td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: estadoColor[s.estado] || "#888" }}>
                    {s.estado}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select className="select" style={{ width: 110, padding: 4, fontSize: 11 }} value={s.estado} onChange={(e) => cambiarEst(iid, e.target.value)}>
                      {["Pendiente", "En Proceso", "Completado", "Rechazado"].map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12 }} title="Editar Solicitud" onClick={() => abrirEdicion(iid)}>✏️</button>
                    <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: 12 }} title="Eliminar Solicitud" onClick={() => borrarSol(iid)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {Object.keys(solicitudes).length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>Sin solicitudes registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(solicitudes).length === 0 && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>Sin solicitudes.</p>
        )}
        {Object.entries(solicitudes).map(([iid, s]) => {
          const color = estadoColor[s.estado] || "#888";
          return (
            <div key={iid} className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{s.agencia || "-"}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}18`, padding: "2px 8px", borderRadius: 10, border: `1px solid ${color}` }}>{s.estado}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>📅 {s.fecha} · 👨‍🔧 {s.tecnico || "Sin asignar"}</div>
                {s.ubicacion && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📍 {s.ubicacion}</div>}
                {s.descripcion && <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2 }}>{s.descripcion}</div>}
              </div>
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-color)", background: "var(--bg-input)", display: "flex", gap: 8, alignItems: "center" }}>
                <select className="select" style={{ flex: 1, fontSize: 12 }} value={s.estado} onChange={(e) => cambiarEst(iid, e.target.value)}>
                  {["Pendiente", "En Proceso", "Completado", "Rechazado"].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} title="Editar" onClick={() => abrirEdicion(iid)}>✏️</button>
                <button className="btn btn-danger" style={{ padding: "6px 10px", fontSize: 12 }} title="Eliminar" onClick={() => borrarSol(iid)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Editar Solicitud */}
      {editItem && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, animation: "fadeIn 0.2s ease"
          }}
          onClick={() => setEditItem(null)}
        >
          <div
            style={{
              background: "var(--bg-card)", borderRadius: 16, padding: 24, width: "90%", maxWidth: 500,
              display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>✏️ Editar Solicitud</h3>
              <button style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setEditItem(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Fecha</label>
                <input className="input" style={{ width: "100%" }} value={editItem.fecha} onChange={(e) => setEditItem({ ...editItem, fecha: e.target.value })} />
              </div>

              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Agencia</label>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  value={editItem.agencia}
                  onChange={(e) => filtrarAgenciasEdit(e.target.value)}
                  onFocus={() => {
                    setEditAgFiltradas(listaAg);
                    setShowEditAgDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowEditAgDropdown(false), 200)}
                />
                {showEditAgDropdown && editAgFiltradas.length > 0 && (
                  <ul className="dropdown-list" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, maxHeight: 150, overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, listStyle: "none", margin: 0, padding: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    {editAgFiltradas.slice(0, 15).map((a) => (
                      <li
                        key={a}
                        onClick={() => {
                          setEditItem({ ...editItem, agencia: a });
                          setShowEditAgDropdown(false);
                        }}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid var(--border-color)" }}
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Ubicación</label>
                <input className="input" style={{ width: "100%" }} value={editItem.ubicacion} onChange={(e) => setEditItem({ ...editItem, ubicacion: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Técnico</label>
                {tecnicos.length > 0 ? (
                  <select className="select" style={{ width: "100%" }} value={editItem.tecnico} onChange={(e) => setEditItem({ ...editItem, tecnico: e.target.value })}>
                    <option value="">-- Sin asignar --</option>
                    {tecnicos.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <input className="input" style={{ width: "100%" }} value={editItem.tecnico} onChange={(e) => setEditItem({ ...editItem, tecnico: e.target.value })} />
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Descripción</label>
                <textarea className="input" style={{ width: "100%", height: 70, resize: "vertical" }} value={editItem.descripcion} onChange={(e) => setEditItem({ ...editItem, descripcion: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Estado</label>
                <select className="select" style={{ width: "100%" }} value={editItem.estado} onChange={(e) => setEditItem({ ...editItem, estado: e.target.value })}>
                  {["Pendiente", "En Proceso", "Completado", "Rechazado"].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setEditItem(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarEdicion}>💾 Guardar Cambios</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

