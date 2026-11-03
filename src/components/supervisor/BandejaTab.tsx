"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESTADOS_INFORME, ESTADO_COLORES, CATEGORIAS } from "@/lib/config";
import { generarTextoSolicitudConsumo, generarTextoResumenInforme } from "@/lib/report-engine";
import { exportarExcelIndividual, exportarTodosExcelZip } from "@/lib/excel-export";
import type { DocumentData } from "firebase/firestore";

interface BandejaTabProps {
  informes: Record<string, DocumentData>;
  materiales: Record<string, DocumentData>;
  dispositivos: Record<string, DocumentData>;
  supervisores: string[];
  tecnicos: string[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  iidSel: string | null;
  setIidSel: (v: string | null) => void;
  cambiarEstado: (iid: string, est: string) => void;
  asignarSup: (iid: string, sup: string) => void;
  asignarTecnicos: (iid: string, tecnicos: string[]) => void;
  eliminar: (iid: string) => void;
}

// ── Sub-componentes para el acordeón mobile de la Bandeja ──

type DetailRow = { cat: string; ubi: string; disp: string; mat: string; cant: string; und: string; obs: string };

function MobileDispGroup({ disp, dispItems, isLast }: { disp: string; dispItems: DetailRow[]; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const obs = dispItems.find(r => r.obs)?.obs || null;
  return (
    <div style={{ borderBottom: !isLast ? "1px solid var(--border-color)" : "none" }}>
      {/* Header dispositivo — clickeable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: open ? "transparent" : "var(--bg-input)", transition: "background 0.15s" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {disp !== "—" ? `🔧 ${disp}` : "📦 Materiales sueltos"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginLeft: 6, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▾</span>
      </div>
      {/* Contenido: materiales + obs (siempre visible) */}
      {open && (
        <div style={{ padding: "0 10px 10px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
          {dispItems.map((r, mIdx) => (
            <div key={mIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, flex: 1, color: "var(--text-primary)" }}>{r.mat}</span>
              <span style={{ fontSize: 12, fontWeight: 800, background: "var(--bg-input)", padding: "2px 9px", borderRadius: 20, border: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>
                {r.cant} {r.und}
              </span>
            </div>
          ))}
          {obs && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid #F0A500", paddingLeft: 6, marginTop: 2 }}>
              ⚠ {obs}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobileUbiGroup({ ubi, items }: { ubi: string; items: DetailRow[] }) {
  const [open, setOpen] = useState(false);
  // Agrupar por dispositivo
  const dispGroups: Record<string, DetailRow[]> = {};
  items.forEach(r => {
    const key = r.disp || "—";
    if (!dispGroups[key]) dispGroups[key] = [];
    dispGroups[key].push(r);
  });
  const dispKeys = Object.keys(dispGroups);
  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, overflow: "hidden" }}>
      {/* Header ubicación — clickeable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ background: "var(--bg-secondary)", padding: "7px 10px", fontSize: 11, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: open ? "1px solid var(--border-color)" : "none" }}>
        <span>📍 {ubi || "Sin ubicación"}</span>
        <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▾</span>
      </div>
      {open && dispKeys.map((disp, dIdx) => (
        <MobileDispGroup key={disp} disp={disp} dispItems={dispGroups[disp]} isLast={dIdx === dispKeys.length - 1} />
      ))}
    </div>
  );
}

function parseFechaToTimestamp(dStr?: unknown): number {
  if (!dStr) return 0;
  if (typeof dStr === "number") return dStr;
  if (typeof dStr === "object" && dStr !== null && "seconds" in (dStr as Record<string, unknown>)) {
    return (dStr as { seconds: number }).seconds * 1000;
  }
  if (typeof dStr !== "string") return 0;
  const str = dStr.trim();
  if (!str) return 0;

  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return parsed;

  return 0;
}

function getInformeSortTime(id: string, pq: DocumentData): number {
  if (pq.created_at) {
    const t = parseFechaToTimestamp(pq.created_at);
    if (t > 0) return t;
  }
  if (pq.updated_at) {
    const t = parseFechaToTimestamp(pq.updated_at);
    if (t > 0) return t;
  }

  if (Array.isArray(pq.modificaciones) && pq.modificaciones.length > 0) {
    const lastMod = pq.modificaciones[pq.modificaciones.length - 1];
    if (lastMod?.fecha_mod) {
      const t = parseFechaToTimestamp(lastMod.fecha_mod);
      if (t > 0) return t;
    }
    const firstMod = pq.modificaciones[0];
    if (firstMod?.fecha_mod) {
      const t = parseFechaToTimestamp(firstMod.fecha_mod);
      if (t > 0) return t;
    }
  }

  if (pq.metadatos?.fecha) {
    const t = parseFechaToTimestamp(pq.metadatos.fecha);
    if (t > 0) return t;
  }

  return 0;
}

export function BandejaTab({
  informes, materiales, dispositivos, supervisores, tecnicos,
  busqueda, setBusqueda, filtroEstado, setFiltroEstado,
  iidSel, setIidSel,
  cambiarEstado, asignarSup, asignarTecnicos, eliminar,
}: BandejaTabProps) {
  const pqSel = iidSel ? informes[iidSel] : null;
  const [modalTexto, setModalTexto] = useState<{ titulo: string; contenido: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const visibles = Object.entries(informes).filter(([, pq]) => {
    const meta = pq.metadatos || {};
    const tecAsig = (pq.tecnicos_asignados || []).join(" ");
    const texto = `${meta.fecha} ${meta.agencia} ${meta.tecnico} ${pq.estado} ${pq.supervisor} ${tecAsig}`.toLowerCase();
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;
    if (filtroEstado !== "Todos" && pq.estado !== filtroEstado) return false;
    return true;
  }).sort(([idA, a], [idB, b]) => {
    const timeA = getInformeSortTime(idA, a);
    const timeB = getInformeSortTime(idB, b);

    if (timeB !== timeA) return timeB - timeA;

    return idB.localeCompare(idA);
  });

  const [progresoZip, setProgresoZip] = useState<{ actual: number; total: number; mensaje: string } | null>(null);
  const canceladoZipRef = useRef(false);

  async function exportarExcel() {
    if (!pqSel) return;
    try {
      await exportarExcelIndividual(pqSel, materiales, dispositivos);
    } catch (err: any) {
      console.error("Error al exportar Excel individual:", err);
      alert("Error al exportar Excel: " + (err?.message || err));
    }
  }

  async function handleDescargarZip() {
    if (visibles.length === 0 || progresoZip) return;
    canceladoZipRef.current = false;
    setProgresoZip({ actual: 0, total: visibles.length, mensaje: "Iniciando exportación a Excel..." });

    try {
      await exportarTodosExcelZip(
        visibles,
        materiales,
        dispositivos,
        (actual, total, mensaje) => {
          setProgresoZip({ actual, total, mensaje });
        },
        () => canceladoZipRef.current
      );
    } catch (err: any) {
      if (err?.message !== "Descarga cancelada por el usuario") {
        console.error("Error al exportar ZIP:", err);
        alert("Ocurrió un error al generar el ZIP: " + (err?.message || err));
      }
    } finally {
      setProgresoZip(null);
    }
  }

  function handleCancelarZip() {
    canceladoZipRef.current = true;
  }

  function buildDetailTable(datos: Record<string, DocumentData[]>) {
    const allRows: { cat: string; ubi: string; disp: string; mat: string; cant: string; und: string; obs: string }[] = [];
    for (const [cat, regs] of Object.entries(datos)) {
      if (!Array.isArray(regs) || regs.length === 0) continue;
      for (const r of regs) {
        const matId = String(r.id_material || "");
        const matInfo = (materiales[matId] as DocumentData) || null;
        const nom = matInfo?.nombre || r.id_material || "Sin nombre";
        const und = matInfo?.unidad || "";
        let disp = "—";
        if (r.id_dispositivo) {
          const dId = String(r.id_dispositivo);
          const dData = (dispositivos[dId] as DocumentData);
          if (dData?.nombre) { disp = dData.nombre; }
          else {
            const buscado = Object.values(dispositivos).find(d => String(d.id) === dId);
            disp = (buscado as DocumentData)?.nombre || r.nombre_custom || "Mat. Suelto";
          }
        } else if (r.nombre_custom) { disp = r.nombre_custom; }
        allRows.push({ cat, ubi: String(r.ubicacion || "").toUpperCase(), disp, mat: nom, cant: String(r.cantidad || ""), und, obs: String(r.observacion || "").trim() });
      }
    }
    allRows.sort((a, b) => { const c = a.ubi.localeCompare(b.ubi); return c !== 0 ? c : a.disp.localeCompare(b.disp); });
    return allRows;
  }

  function toggleTecnicoAsignado(nombre: string) {
    if (!iidSel || !pqSel) return;
    const actuales = pqSel.tecnicos_asignados || [];
    const nuevos = actuales.includes(nombre)
      ? actuales.filter((t: string) => t !== nombre)
      : [...actuales, nombre];
    asignarTecnicos(iidSel, nuevos);
  }

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div className="bandeja-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "480px 1fr", gap: "var(--space-md)", flex: 1, minHeight: 0 }}>

        {/* COLUMNA IZQUIERDA — oculta en mobile cuando hay selección */}
        <div style={{ display: isMobile && iidSel ? "none" : "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
            <input className="input" placeholder="🔍 Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
            <select className="select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
              <option value="Todos">Todos</option>
              {ESTADOS_INFORME.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Botón Descargar Todos en ZIP */}
          <button
            className="btn btn-success"
            onClick={handleDescargarZip}
            disabled={visibles.length === 0 || !!progresoZip}
            title={visibles.length > 0 ? `Descargar ${visibles.length} informes en un archivo ZIP con todos sus Excels` : "No hay informes para descargar"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 8,
              background: visibles.length === 0 || !!progresoZip ? "var(--bg-secondary)" : "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
              color: visibles.length === 0 || !!progresoZip ? "var(--text-muted)" : "#ffffff",
              border: "1px solid var(--border-color)",
              boxShadow: visibles.length === 0 || !!progresoZip ? "none" : "0 2px 6px rgba(27, 94, 32, 0.25)",
              cursor: visibles.length === 0 || !!progresoZip ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15 }}>📦</span>
            <span>
              {busqueda.trim() || filtroEstado !== "Todos"
                ? `Descargar ZIP filtrados (${visibles.length} excels)`
                : `Descargar todos en ZIP (${visibles.length} excels)`}
            </span>
          </button>

          {/* Lista de cards */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, minHeight: 0 }}>
            {visibles.map(([iid, pq], index) => {
              const meta = pq.metadatos || {};
              const colors = ESTADO_COLORES[pq.estado] || ESTADO_COLORES["Pendiente"];
              const nRegs = Object.values(pq.datos || {}).reduce((a: number, v: unknown) => a + (Array.isArray(v) ? v.length : 0), 0);
              const tecAsig = pq.tecnicos_asignados || [];
              return (
                <div key={iid} className="informe-card hover-lift animate-fade-in" onClick={() => setIidSel(iid)}
                  style={{ animationFillMode: "both", animationDelay: `${index * 0.04}s`, flexShrink: 0, minHeight: "auto", borderColor: colors.border, background: iidSel === iid ? `color-mix(in srgb, ${colors.border} 8%, var(--bg-card))` : "var(--bg-card)", borderWidth: "1px", borderLeftWidth: "6px", borderLeftColor: colors.border, borderStyle: "solid", borderRadius: 10, overflow: "hidden", transition: "all 0.2s ease", boxShadow: iidSel === iid ? `0 0 0 3px color-mix(in srgb, ${colors.border} 25%, transparent)` : "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ background: "transparent", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid color-mix(in srgb, ${colors.border} 30%, transparent)` }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "12px" }}>{meta.agencia || "-"}</span>
                    <span style={{ background: `color-mix(in srgb, ${colors.border} 25%, transparent)`, color: "var(--text-primary)", padding: "4px 10px", borderRadius: "12px", fontSize: "10px", fontWeight: 700 }}>{pq.estado}</span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, fontSize: "11px", color: "var(--text-primary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>👨‍🔧 <strong>{meta.tecnico || "-"}</strong></span>
                    <span style={{ color: "var(--text-secondary)" }}>📅 {meta.fecha || "-"} · 👤 {pq.supervisor || "Sin Asignar"}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>📦 {nRegs} registro(s) ingresados</span>
                  </div>
                </div>
              );
            })}
            {visibles.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>No hay informes.</p>}
          </div>
        </div> {/* FIN COLUMNA IZQUIERDA */}

        {/* Panel Detalle — ocupa pantalla completa en mobile */}
        <div className="glass-panel" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: isMobile && !iidSel ? "none" : "flex", flexDirection: "column", padding: isMobile ? "12px" : "16px" }}>

          {!pqSel ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>← Selecciona un informe</p>
          ) : (
            <>
              <div style={{ position: "sticky", top: -16, background: "var(--bg-card)", padding: "16px", margin: "-16px -16px 16px -16px", borderBottom: "1px solid var(--border-color)", zIndex: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isMobile && (
                      <button
                        onClick={() => setIidSel(null)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "var(--color-primary)",
                          flexShrink: 0,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          transition: "all 0.2s"
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                    )}
                    <h3 style={{ fontSize: "16px", margin: 0 }}>{pqSel.metadatos?.agencia}</h3>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                      <span>Técnico: <strong>{pqSel.metadatos?.tecnico}</strong></span>
                      <span>📅 <strong>{pqSel.metadatos?.fecha}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Selects */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="select" style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 12 }} value={pqSel.estado} onChange={(e) => { if (e.target.value && iidSel) cambiarEstado(iidSel, e.target.value); }}>
                      {ESTADOS_INFORME.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select className="select" style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 12 }} value={pqSel.supervisor || ""} onChange={(e) => { if (iidSel) asignarSup(iidSel, e.target.value); }}>
                      <option value="">👤 Asignar Sup…</option>
                      {supervisores.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Botones */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-warning" style={{ flex: 1, padding: "8px 0", fontSize: 12 }} onClick={() => {
                      const txt = generarTextoSolicitudConsumo(pqSel, materiales as Record<string, { nombre: string; unidad: string }>, dispositivos as Record<string, { nombre: string }>);
                      setModalTexto({ titulo: "📦 Solicitud de Consumo", contenido: txt });
                    }}>📦 Consumo</button>
                    <button className="btn btn-primary" style={{ flex: 1, padding: "8px 0", fontSize: 12 }} onClick={() => {
                      const txt = generarTextoResumenInforme(pqSel, materiales as Record<string, { nombre: string; unidad: string }>, dispositivos as Record<string, { nombre: string }>);
                      setModalTexto({ titulo: "📄 Resumen del Informe", contenido: txt });
                    }}>📄 Resumen</button>
                    <button className="btn btn-success" style={{ flex: 1, padding: "8px 0", fontSize: 12 }} onClick={exportarExcel}>📊 Excel</button>
                    <button className="btn btn-danger" style={{ padding: "8px 12px" }} onClick={() => iidSel && eliminar(iidSel)}>🗑️</button>
                  </div>
                </div>
              </div>

              {/* Detail table by category */}
              {(() => {
                const rows = buildDetailTable(pqSel.datos || {});
                if (rows.length === 0) return <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Sin registros</p>;
                const cats = [...new Set(rows.map(r => r.cat))];
                return cats.map(cat => {
                  const catRows = rows.filter(r => r.cat === cat);
                  // Agrupar por ubicación para la vista mobile
                  const ubiGroups: Record<string, typeof catRows> = {};
                  catRows.forEach(r => {
                    if (!ubiGroups[r.ubi]) ubiGroups[r.ubi] = [];
                    ubiGroups[r.ubi].push(r);
                  });
                  return (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <div style={{ background: "var(--color-info)", color: "#fff", padding: "6px 12px", borderRadius: "6px 6px 0 0", fontSize: 13, fontWeight: 700 }}>
                        📂 {cat.toUpperCase()}
                      </div>

                      {/* ── Desktop: tabla con rowspan ── */}
                      <div className="table-container mobile-hide" style={{ borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
                        <table className="table" style={{ fontSize: "11px", tableLayout: "fixed", width: "100%" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "18%" }}>Ubicación</th>
                              <th style={{ width: "20%" }}>Dispositivo</th>
                              <th style={{ width: "24%" }}>Material</th>
                              <th style={{ width: "10%" }}>Cant</th>
                              <th style={{ width: "28%" }}>Observación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const ubiSpans: number[] = [];
                              const dispSpans: number[] = [];
                              const obsSpans: number[] = [];
                              let i = 0;
                              while (i < catRows.length) {
                                let j = i + 1;
                                while (j < catRows.length && catRows[j].ubi === catRows[i].ubi) j++;
                                ubiSpans[i] = j - i;
                                for (let k = i + 1; k < j; k++) ubiSpans[k] = 0;
                                let d_i = i;
                                while (d_i < j) {
                                  let d_j = d_i + 1;
                                  while (d_j < j && catRows[d_j].disp === catRows[d_i].disp) d_j++;
                                  dispSpans[d_i] = d_j - d_i;
                                  for (let d_k = d_i + 1; d_k < d_j; d_k++) dispSpans[d_k] = 0;
                                  let o_i = d_i;
                                  while (o_i < d_j) {
                                    let o_j = o_i + 1;
                                    while (o_j < d_j && catRows[o_j].obs === catRows[o_i].obs) o_j++;
                                    obsSpans[o_i] = o_j - o_i;
                                    for (let o_k = o_i + 1; o_k < o_j; o_k++) obsSpans[o_k] = 0;
                                    o_i = o_j;
                                  }
                                  d_i = d_j;
                                }
                                i = j;
                              }
                              return catRows.map((r, idx) => (
                                <tr key={idx}>
                                  {ubiSpans[idx] > 0 && (
                                    <td rowSpan={ubiSpans[idx]} style={{ fontWeight: 700, verticalAlign: "middle", background: "var(--bg-secondary)", borderRight: "2px solid var(--border-color)", padding: "8px" }}>
                                      📍 {r.ubi}
                                    </td>
                                  )}
                                  {dispSpans[idx] > 0 && (
                                    <td rowSpan={dispSpans[idx]} style={{ verticalAlign: "middle", fontWeight: 600, borderRight: "1px solid var(--border-color)", padding: "8px" }}>
                                      {r.disp}
                                    </td>
                                  )}
                                  <td style={{ padding: "6px 8px" }}>{r.mat}</td>
                                  <td style={{ textAlign: "center", fontWeight: 600, whiteSpace: "nowrap", padding: "6px 8px" }}>{r.cant} {r.und}</td>
                                  {obsSpans[idx] > 0 && (
                                    <td rowSpan={obsSpans[idx]} style={{ verticalAlign: "middle", color: "var(--text-secondary)", fontStyle: r.obs ? "normal" : "italic", padding: "8px" }}>
                                      {r.obs || "—"}
                                    </td>
                                  )}
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Mobile: acordeón ubicación → dispositivo ── */}
                      <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                        {Object.entries(ubiGroups).map(([ubi, items]) => (
                          <MobileUbiGroup key={ubi} ubi={ubi} items={items} />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Historial de modificaciones */}
              {pqSel.modificaciones && pqSel.modificaciones.length > 0 && (
                <div style={{ marginTop: "var(--space-md)" }}>
                  <h4 style={{ fontSize: "var(--font-size-sm)", marginBottom: 8 }}>🕐 Historial de cambios</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Fecha</th><th>Técnico</th><th>Tipo</th><th>Descripción</th></tr></thead>
                      <tbody>
                        {[...pqSel.modificaciones].reverse().map((m: DocumentData, i: number) => (
                          <tr key={i}><td>{m.fecha_mod}</td><td>{m.tecnico}</td><td>{m.tipo}</td><td>{m.descripcion}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ MODAL Progreso Descarga ZIP ═══ */}
      {progresoZip && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{
            background: "var(--bg-card)",
            borderRadius: 16,
            padding: 24,
            width: "90%",
            maxWidth: 460,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>📦</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  Generando Archivo ZIP
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Procesando {progresoZip.total} informes de Excel
                </span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div>
              <div style={{
                height: 10,
                width: "100%",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid var(--border-color)"
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((progresoZip.actual / progresoZip.total) * 100)}%`,
                  background: "linear-gradient(90deg, #2E75B6 0%, #4CAF50 100%)",
                  borderRadius: 8,
                  transition: "width 0.2s ease"
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-secondary)" }}>
                <span>{progresoZip.actual} de {progresoZip.total}</span>
                <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                  {Math.round((progresoZip.actual / progresoZip.total) * 100)}%
                </span>
              </div>
            </div>

            <p style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-primary)",
              background: "var(--bg-secondary)",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {progresoZip.mensaje}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                className="btn btn-outline"
                style={{ fontSize: 12, padding: "6px 14px", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                onClick={handleCancelarZip}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ MODAL Consumo / Resumen ═══ */}
      {modalTexto && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, animation: "fadeIn 0.2s ease" }}
          onClick={() => setModalTexto(null)}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 24, width: "90%", maxWidth: 700, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{modalTexto.titulo}</h3>
              <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setModalTexto(null)}>✕</button>
            </div>
            <textarea readOnly value={modalTexto.contenido} style={{ flex: 1, minHeight: 300, padding: 16, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, fontFamily: "monospace", fontSize: 13, color: "var(--text-primary)", resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setModalTexto(null)}>Cerrar</button>
              <button className="btn btn-success" onClick={() => { navigator.clipboard.writeText(modalTexto.contenido); alert("📋 Copiado al portapapeles"); }}>📋 Copiar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
