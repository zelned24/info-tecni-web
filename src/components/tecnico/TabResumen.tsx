"use client";

import React, { useState } from "react";
import { CATEGORIAS, type Categoria } from "@/lib/config";
import {
  getReporteActual,
  getMateriales,
  getDispositivos,
  getListaNombresDisp,
  eliminarRegistro,
} from "@/lib/store";
import type { Registro } from "@/lib/report-engine";
import { Modal } from "@/components/Modal";

interface TabResumenProps {
  onUpdate: () => void;
  showAlert: (msg: string) => void;
  onDescargarPDF?: () => void;
}

export function TabResumen({ onUpdate, showAlert, onDescargarPDF }: TabResumenProps) {
  const reporte = getReporteActual();
  const materiales = getMateriales();
  const dispositivos = getDispositivos();
  const [editando, setEditando] = useState<{ cat: Categoria; idx: number; r: Registro } | null>(null);
  const [editForm, setEditForm] = useState({ ubicacion: "", disp: "", nombre_custom: "", cant: "", obs: "" });
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, msg: string, action: () => void} | null>(null);

  const dispList = getListaNombresDisp();

  function abrirEdicion(cat: Categoria, idx: number, r: Registro) {
    setEditando({ cat, idx, r });
    setEditForm({
      ubicacion: r.ubicacion,
      disp: r.id_dispositivo ? dispositivos[String(r.id_dispositivo)]?.nombre || "" : "",
      nombre_custom: r.nombre_custom || "",
      cant: String(r.cantidad),
      obs: r.observacion || ""
    });
  }

  function guardarEdicion() {
    if (!editando) return;
    const { cat, r } = editando;
    r.ubicacion = editForm.ubicacion.trim();
    r.cantidad = editForm.cant;
    r.observacion = editForm.obs.trim();
    if (editForm.disp) {
      if (dispList.includes(editForm.disp)) {
        r.id_dispositivo = Object.entries(dispositivos).find(([, d]) => d.nombre === editForm.disp)?.[0] || null;
        r.nombre_custom = "";
      } else {
        r.id_dispositivo = null;
        r.nombre_custom = editForm.disp;
      }
    } else {
      r.id_dispositivo = null;
      r.nombre_custom = "";
    }
    setEditando(null);
    onUpdate();
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", paddingBottom: 0 }}>
      <h3 style={{ marginBottom: "var(--space-md)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span>📋 Resumen del Informe</span>
        {onDescargarPDF && (
          <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={onDescargarPDF}>
            📄 Descargar PDF
          </button>
        )}
      </h3>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16, paddingRight: 4 }}>
        {CATEGORIAS.map((cat) => {
          const regs = reporte[cat];
          if (regs.length === 0) return null;
          
          return (
            <details key={cat} open style={{ marginBottom: 8, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 4, overflow: "hidden" }}>
              <summary style={{ background: "var(--color-primary)", color: "white", padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", userSelect: "none" }}>
                📂 {cat.toUpperCase()} ({regs.length})
              </summary>
              <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(
                  regs.reduce((acc, r, i) => {
                    const zona = r.ubicacion || "Sin Zona";
                    const equipo = r.id_dispositivo ? (dispositivos[String(r.id_dispositivo)]?.nombre || r.id_dispositivo) : (r.nombre_custom || "General / Varios");
                    if (!acc[zona]) acc[zona] = {};
                    if (!acc[zona][equipo]) acc[zona][equipo] = [];
                    acc[zona][equipo].push({ r, i });
                    return acc;
                  }, {} as Record<string, Record<string, { r: Registro, i: number }[]>>)
                ).map(([zona, equipos]) => (
                  <details key={zona} open style={{ border: "1px solid var(--border-color)", borderRadius: 4, overflow: "hidden" }}>
                    <summary style={{ padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "rgba(46,117,182,0.05)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, userSelect: "none", borderBottom: "1px solid var(--border-color)" }}>
                      📁 {zona}
                    </summary>
                    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(equipos).map(([equipo, items]) => (
                        <details key={equipo} open style={{ borderLeft: "2px solid var(--border-color)", paddingLeft: 10 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, userSelect: "none" }}>
                            📄 {equipo}
                          </summary>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {items.map(({ r, i: idxOriginal }) => {
                              const nom = materiales[String(r.id_material)]?.nombre || r.id_material;
                              const und = materiales[String(r.id_material)]?.unidad || "";
                              return (
                                <div key={idxOriginal} onClick={() => abrirEdicion(cat, idxOriginal, r)}
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-input)", padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border-color)", cursor: "pointer" }}
                                  title="Haz clic para editar"
                                >
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{nom}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cant: {r.cantidad} {und}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {r.observacion && <div style={{ fontSize: 10, color: "var(--color-warning)", maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📝 {r.observacion}</div>}
                                    <button style={{ border: "none", background: "transparent", color: "var(--color-danger)", cursor: "pointer", fontSize: 14, padding: "4px 8px" }}
                                      onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, msg: "¿Eliminar este registro?", action: () => { eliminarRegistro(cat, idxOriginal); onUpdate(); setConfirmModal(null); } }); }}>
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          );
        })}
        {!Object.values(reporte).some((r) => r.length > 0) && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>El informe está vacío</p>
        )}
      </div>

      {/* Modal de Confirmación */}
      {confirmModal && (
        <Modal
          isOpen={confirmModal.isOpen}
          title="Confirmar"
          message={confirmModal.msg}
          type="confirm"
          onConfirm={confirmModal.action}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Modal de Edición */}
      {editando && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyItems: "center", padding: 20 }}>
          <div className="card animate-slide-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <h3>✏️ Editar Registro</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{materiales[String(editando.r.id_material)]?.nombre || editando.r.id_material}</p>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>📍 Zona / Ubicación</label>
              <input className="input" value={editForm.ubicacion} onChange={e => setEditForm({...editForm, ubicacion: e.target.value})} />
            </div>

            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>🔧 Dispositivo / Equipo</label>
              <input className="input" value={editForm.disp} onChange={e => setEditForm({...editForm, disp: e.target.value})} list="disp-list-edit" />
              <datalist id="disp-list-edit">
                {dispList.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>📦 Cantidad</label>
              <input className="input" type="number" value={editForm.cant} onChange={e => setEditForm({...editForm, cant: e.target.value})} />
            </div>

            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>💬 Observación</label>
              <input className="input" value={editForm.obs} onChange={e => setEditForm({...editForm, obs: e.target.value})} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button className="btn btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarEdicion}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
