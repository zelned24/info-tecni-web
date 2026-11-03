"use client";

import React, { useState, useEffect } from "react";
import { hapticImpact, hapticSelection } from "@/lib/haptics";
import { ImpactStyle } from "@capacitor/haptics";
import type { DocumentData } from "firebase/firestore";
import { ContextMenu, type CtxMenuState } from "./ContextMenu";

interface DashboardTabProps {
  conteo: Record<string, number>;
  total: number;
  informes: Record<string, DocumentData>;
  solicitudes: Record<string, DocumentData>;
  supervisores: string[];
  tecnicos: string[];
  materiales: Record<string, DocumentData>;
  dispositivos: Record<string, DocumentData>;
  cambiarEstado: (iid: string, est: string) => void;
  asignarSup: (iid: string, sup: string) => void;
  asignarTecnicos: (iid: string, tecnicos: string[]) => void;
  eliminarInforme: (iid: string) => void;
  onOpenReport: (iid: string) => void;
  setTab: (t: "Dashboard" | "Bandeja" | "Solicitudes") => void;
  setIidSel: (v: string | null) => void;
  setFiltroEstado: (v: string) => void;
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroEstado: string;
}

const TableCard = ({ title, color, count, onDropEstado, children, isMobile, onDrop }: any) => {
  const [collapsed, setCollapsed] = useState(isMobile);

  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  return (
    <div className={`card ${onDropEstado ? 'table-card-drop-zone' : ''}`}
      data-color={color}
      onDragOver={(e) => { if (onDropEstado) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
      onDrop={(e) => { if (onDropEstado && onDrop) onDrop(e, onDropEstado); }}
      style={{
        padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        transition: 'all 0.2s ease',
        marginBottom: 12, flex: collapsed ? 'none' : 1, minHeight: 0
      }}>
      {/* Header — clickeable en mobile para colapsar */}
      <div
        onClick={() => isMobile && setCollapsed((c: boolean) => !c)}
        style={{ background: color, borderBottom: `1px solid rgba(0,0,0,0.1)`, padding: "4px 12px", color: "#ffffff", fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, cursor: isMobile ? 'pointer' : 'default', userSelect: 'none' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, filter: "brightness(0) invert(1)" }}>📋</span>
          <span style={{ fontSize: 13 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {count !== undefined && <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", borderRadius: 12, padding: "2px 8px", fontSize: 11 }}>{count}</span>}
          {isMobile && <span style={{ fontSize: 14, opacity: 0.9, transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>}
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: 0, flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
};

export function DashboardTab({
  conteo, total, informes, solicitudes,
  supervisores, tecnicos,
  cambiarEstado, asignarSup, asignarTecnicos,
  onOpenReport, setTab, setFiltroEstado
}: DashboardTabProps) {

  const informesArr = Object.entries(informes).map(([id, inf]) => ({ id, ...inf }));
  const solArr = Object.entries(solicitudes)
    .map(([id, sol]) => ({ id, ...sol }))
    .filter((sol: any) => sol.estado !== "Completado" && sol.estado !== "Rechazado");

  // Estado del menú contextual
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, iid: string, tipo: string) => {
    e.preventDefault();
    let y = e.clientY;
    // Evitar que el menú se desborde al expandirse si se hace clic muy abajo
    if (y > window.innerHeight - 280) {
      y = window.innerHeight - 280;
    }
    setCtxMenu({ x: e.clientX, y, iid, tipo });
  };

  // Filtrado de listas según la captura
  const informesPresentar = informesArr.filter((i: any) => i.estado === "Previo Creado");
  const agenciasEjecucion = informesArr.filter((i: any) => i.estado === "En Proceso");
  const informesAprobar = informesArr.filter((i: any) => i.estado === "En Espera de Aprobación" || i.estado === "En Espera");
  const informesAprobados = informesArr.filter((i: any) => i.estado === "Aprobado");

  const kpiItems = [
    { label: "TOTAL", value: total, color: "#2E75B6", action: () => { setFiltroEstado("Todos"); setTab("Bandeja"); } },
    { label: "PENDIENTES", value: conteo["Pendiente"] || 0, color: "#F0A500", action: () => { setFiltroEstado("Pendiente"); setTab("Bandeja"); } },
    { label: "EN PROCESO", value: conteo["En Proceso"] || 0, color: "#4FC3F7", action: () => { setFiltroEstado("En Proceso"); setTab("Bandeja"); } },
    { label: "EN ESPERA", value: (conteo["En Espera de Aprobación"] || 0) + (conteo["En Espera"] || 0), color: "#9C27B0", action: () => { setFiltroEstado("En Espera de Aprobación"); setTab("Bandeja"); } },
    { label: "FINALIZADOS", value: conteo["Finalizado"] || 0, color: "#4CAF50", action: () => { setFiltroEstado("Finalizado"); setTab("Bandeja"); } },
    { label: "SOLICITUDES", value: solArr.length, color: "#F0A500", action: () => { setTab("Solicitudes"); } },
  ];

  const handleDrop = (e: React.DragEvent, newEstado: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      cambiarEstado(id, newEstado);
      hapticImpact(ImpactStyle.Light);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";

    const dropZones = document.querySelectorAll('.table-card-drop-zone') as NodeListOf<HTMLElement>;
    dropZones.forEach(zone => {
      const c = zone.dataset.color || '#ccc';
      zone.style.border = `2px dashed ${c}`;
      zone.style.background = `${c}0A`;
      zone.style.transform = 'scale(1.01)';
    });

    // Hacemos la fila semitransparente para indicar que se está moviendo
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = "0.4";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const dropZones = document.querySelectorAll('.table-card-drop-zone') as NodeListOf<HTMLElement>;
    dropZones.forEach(zone => {
      zone.style.border = '1px solid var(--border-color)';
      zone.style.background = 'var(--bg-card)';
      zone.style.transform = 'none';
    });

    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
  };

  const renderBadge = (estado: string) => {
    let bg = "rgba(0,0,0,0.1)";
    let col = "inherit";
    let text = estado;

    if (estado === "Previo Creado" || estado === "Pendiente") { bg = "rgba(46, 117, 182, 0.1)"; col = "#2E75B6"; }
    else if (estado === "En Proceso") { bg = "rgba(79, 195, 247, 0.1)"; col = "#2196F3"; }
    else if (estado === "En Espera" || estado === "En Espera de Aprobación") { bg = "rgba(156, 39, 176, 0.1)"; col = "#9C27B0"; text = "ESPERA"; }
    else if (estado === "Finalizado" || estado === "Aprobado") { bg = "rgba(76, 175, 80, 0.1)"; col = "#4CAF50"; text = "OK"; }

    return <span className="badge" style={{ background: bg, color: col, border: `1px solid transparent` }}>{text}</span>;
  };

  return (
    <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: isMobile ? "auto" : "hidden" }}>
      {/* KPIs Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        {kpiItems.map((kpi, i) => (
          <div key={i} className="card hover-lift" onClick={() => { hapticSelection(); kpi.action(); }}
            style={{ padding: "12px", borderTop: `4px solid ${kpi.color}`, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginTop: 6, letterSpacing: 0.5 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Grid de Tablas */}
      <div style={{ display: "flex", gap: 6, flex: isMobile ? "none" : 1, minHeight: 0, flexWrap: isMobile ? "wrap" : "nowrap", overflowY: isMobile ? "visible" : "hidden" }}>

        {/* COLUMNA 1 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "auto" : 0, minWidth: isMobile ? "100%" : 320, flex: isMobile ? "none" : "4 1 0%", width: isMobile ? "100%" : undefined }}>
          <TableCard title="Informes por Presentar" color="#2E75B6" count={informesPresentar.length} onDropEstado="Previo Creado" isMobile={isMobile} onDrop={handleDrop}>
            {/* Desktop: tabla completa */}
            <table className="table mobile-hide">
              <thead>
                <tr>
                  <th>AGENCIA</th>
                  <th>TÉCNICO</th>
                  <th>SUPERVISOR</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {informesPresentar.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center" }}>Sin registros</td></tr>}
                {informesPresentar.map((inf: any) => (
                  <tr key={inf.id} draggable style={{ cursor: "grab" }} onDragStart={(e) => handleDragStart(e, inf.id)} onDragEnd={handleDragEnd} onDoubleClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "presentar")}>
                    <td style={{ fontWeight: 600 }}>{inf.metadatos?.agencia || "-"}</td>
                    <td>{inf.tecnicos_asignados?.[0] || inf.metadatos?.tecnico || inf.tecnico || "-"}</td>
                    <td>{inf.supervisor || "Sin Asignar"}</td>
                    <td>{renderBadge(inf.estado || "Pendiente")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile: cards */}
            <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
              {informesPresentar.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 8 }}>Sin registros</div>}
              {informesPresentar.map((inf: any) => (
                <div key={inf.id} onClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "presentar")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border-color)", cursor: "pointer", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inf.metadatos?.agencia || "-"}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{inf.tecnicos_asignados?.[0] || inf.metadatos?.tecnico || "-"}</div>
                  </div>
                  {renderBadge(inf.estado || "Pendiente")}
                </div>
              ))}
            </div>
          </TableCard>

          <TableCard title="Agencias en Ejecución" color="#2196F3" count={agenciasEjecucion.length} onDropEstado="En Proceso" isMobile={isMobile} onDrop={handleDrop}>
            <table className="table mobile-hide">
              <thead>
                <tr>
                  <th>AGENCIA</th>
                  <th>TÉCNICO</th>
                  <th>SUPERVISOR</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {agenciasEjecucion.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center" }}>Sin registros</td></tr>}
                {agenciasEjecucion.map((inf: any) => (
                  <tr key={inf.id} draggable style={{ cursor: "grab" }} onDragStart={(e) => handleDragStart(e, inf.id)} onDragEnd={handleDragEnd} onDoubleClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "ejecucion")}>
                    <td style={{ fontWeight: 600 }}>{inf.metadatos?.agencia || "-"}</td>
                    <td>{inf.tecnicos_asignados?.[0] || inf.metadatos?.tecnico || inf.tecnico || "-"}</td>
                    <td>{inf.supervisor || "Sin Asignar"}</td>
                    <td>{renderBadge(inf.estado || "En Proceso")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
              {agenciasEjecucion.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 8 }}>Sin registros</div>}
              {agenciasEjecucion.map((inf: any) => (
                <div key={inf.id} onClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "ejecucion")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border-color)", cursor: "pointer", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inf.metadatos?.agencia || "-"}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{inf.tecnicos_asignados?.[0] || inf.metadatos?.tecnico || "-"}</div>
                  </div>
                  {renderBadge(inf.estado || "En Proceso")}
                </div>
              ))}
            </div>
          </TableCard>
        </div>

        {/* COLUMNA 2 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "auto" : 0, minWidth: isMobile ? "100%" : 230, flex: isMobile ? "none" : "2 1 0%", width: isMobile ? "100%" : undefined }}>
          <TableCard title="Agencias por Aprobar" color="#9C27B0" count={informesAprobar.length} onDropEstado="En Espera de Aprobación" isMobile={isMobile} onDrop={handleDrop}>
            <table className="table mobile-hide">
              <thead>
                <tr>
                  <th>AGENCIA</th>
                  <th>ESTADO</th>
                  <th>SUPERVISOR</th>
                </tr>
              </thead>
              <tbody>
                {informesAprobar.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center" }}>Sin registros</td></tr>}
                {informesAprobar.map((inf: any) => (
                  <tr key={inf.id} draggable style={{ cursor: "grab" }} onDragStart={(e) => handleDragStart(e, inf.id)} onDragEnd={handleDragEnd} onDoubleClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "aprobar")}>
                    <td style={{ fontWeight: 600 }}>{inf.metadatos?.agencia || "-"}</td>
                    <td>{renderBadge(inf.estado || "En Espera")}</td>
                    <td>{inf.supervisor || "Sin Asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
              {informesAprobar.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 8 }}>Sin registros</div>}
              {informesAprobar.map((inf: any) => (
                <div key={inf.id} onClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "aprobar")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border-color)", cursor: "pointer", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{inf.metadatos?.agencia || "-"}</div>
                  {renderBadge(inf.estado || "En Espera")}
                </div>
              ))}
            </div>
          </TableCard>

          <TableCard title="Informes Aprobados" color="#4CAF50" count={informesAprobados.length} onDropEstado="Aprobado" isMobile={isMobile} onDrop={handleDrop}>
            <table className="table mobile-hide">
              <thead>
                <tr>
                  <th>AGENCIA</th>
                  <th>ESTADO</th>
                  <th>SUPERVISOR</th>
                </tr>
              </thead>
              <tbody>
                {informesAprobados.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center" }}>Sin registros</td></tr>}
                {informesAprobados.map((inf: any) => (
                  <tr key={inf.id} draggable style={{ cursor: "grab" }} onDragStart={(e) => handleDragStart(e, inf.id)} onDragEnd={handleDragEnd} onDoubleClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "aprobados")}>
                    <td style={{ fontWeight: 600 }}>{inf.metadatos?.agencia || "-"}</td>
                    <td>{renderBadge(inf.estado || "Aprobado")}</td>
                    <td>{inf.supervisor || "Sin Asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
              {informesAprobados.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 8 }}>Sin registros</div>}
              {informesAprobados.map((inf: any) => (
                <div key={inf.id} onClick={() => onOpenReport(inf.id)} onContextMenu={(e) => handleContextMenu(e, inf.id, "aprobados")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border-color)", cursor: "pointer", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{inf.metadatos?.agencia || "-"}</div>
                  {renderBadge(inf.estado || "Aprobado")}
                </div>
              ))}
            </div>
          </TableCard>
        </div>

        {/* COLUMNA 3 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "auto" : 0, minWidth: isMobile ? "100%" : 280, flex: isMobile ? "none" : "1.5 1 0%", width: isMobile ? "100%" : undefined }}>
          <TableCard title="Solicitudes de Atención" color="#F0A500" count={solArr.length} isMobile={isMobile} onDrop={handleDrop}>
            <table className="table mobile-hide">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>AGENCIA</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {solArr.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center" }}>Sin registros</td></tr>}
                {solArr.map((sol: any) => (
                  <tr key={sol.id} onDoubleClick={() => setTab("Solicitudes")}>
                    <td>{sol.fecha || "-"}</td>
                    <td style={{ fontWeight: 600 }}>{sol.agencia || "-"}</td>
                    <td>{renderBadge(sol.estado || "Pendiente")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="desktop-hide" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
              {solArr.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 8 }}>Sin registros</div>}
              {solArr.map((sol: any) => (
                <div key={sol.id} onClick={() => setTab("Solicitudes")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border-color)", cursor: "pointer", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{sol.agencia || "-"}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{sol.fecha || ""}</div>
                  </div>
                  {renderBadge(sol.estado || "Pendiente")}
                </div>
              ))}
            </div>
          </TableCard>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          ctxMenu={ctxMenu}
          supervisores={supervisores || []}
          tecnicos={tecnicos || []}
          informes={informes}
          onClose={() => setCtxMenu(null)}
          onVerDetalle={(iid) => onOpenReport(iid)}
          onCambiarEstado={(iid, est) => cambiarEstado(iid, est)}
          onAsignarSup={(iid, sup) => asignarSup(iid, sup)}
          onAsignarTecnicos={(iid, tecs) => asignarTecnicos(iid, tecs)}
        />
      )}
    </div>
  );
}
