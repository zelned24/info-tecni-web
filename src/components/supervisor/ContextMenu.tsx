"use client";

import React from "react";
import { createPortal } from "react-dom";

interface CtxItemProps {
  icon: string;
  label: string;
  onClick: () => void;
}

export function CtxItem({ icon, label, onClick }: CtxItemProps) {
  return (
    <div onClick={onClick} style={{ padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 500, display: "flex", gap: 8, alignItems: "center", transition: "all 0.1s ease", margin: "1px 4px", borderRadius: "6px", color: "var(--text-color)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <span style={{ fontSize: "14px" }}>{icon}</span><span>{label}</span>
    </div>
  );
}

export interface CtxMenuState {
  x: number;
  y: number;
  iid: string;
  tipo: string;
}

interface ContextMenuProps {
  ctxMenu: CtxMenuState;
  supervisores: string[];
  tecnicos: string[];
  informes: Record<string, { tecnicos_asignados?: string[] }>;
  onClose: () => void;
  onVerDetalle: (iid: string) => void;
  onCambiarEstado: (iid: string, estado: string) => void;
  onAsignarSup: (iid: string, sup: string) => void;
  onAsignarTecnicos: (iid: string, tecnicos: string[]) => void;
}

export function ContextMenu({
  ctxMenu,
  supervisores,
  tecnicos,
  informes,
  onClose,
  onVerDetalle,
  onCambiarEstado,
  onAsignarSup,
  onAsignarTecnicos,
}: ContextMenuProps) {
  const informe = informes[ctxMenu.iid];
  const tecnicosAsignados = informe?.tecnicos_asignados || [];

  function toggleTecnico(nombre: string) {
    const nuevos = tecnicosAsignados.includes(nombre)
      ? tecnicosAsignados.filter((t) => t !== nombre)
      : [...tecnicosAsignados, nombre];
    onAsignarTecnicos(ctxMenu.iid, nuevos);
  }

  return createPortal(
    <>
      {/* Invisible overlay to close menu when clicking outside */}
      <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)", zIndex: 99999, minWidth: 200, padding: "4px 0", animation: "fadeIn 0.1s ease-out" }}
        onClick={(e) => e.stopPropagation()}>
        <CtxItem icon="👁️" label="Ver detalle completo" onClick={() => { onVerDetalle(ctxMenu.iid); onClose(); }} />

      {ctxMenu.tipo === "presentar" && <>
        <CtxItem icon="⏳" label="Enviar a Por Aprobar" onClick={() => { onCambiarEstado(ctxMenu.iid, "En Espera de Aprobación"); onClose(); }} />
        <CtxItem icon="🚀" label="Pasar a Ejecución" onClick={() => { onCambiarEstado(ctxMenu.iid, "En Proceso"); onClose(); }} />
        <details style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0", paddingTop: "4px", paddingBottom: "4px" }}>
          <summary style={{ padding: "6px 12px", fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", outline: "none" }}>👥 Asignar Supervisor</summary>
          <div style={{ maxHeight: 180, overflowY: "auto", paddingLeft: 8, marginTop: 4 }}>
            {supervisores.map((s) => (
              <CtxItem key={s} icon="👤" label={s} onClick={() => { onAsignarSup(ctxMenu.iid, s); onClose(); }} />
            ))}
          </div>
        </details>
      </>}

      {ctxMenu.tipo === "ejecucion" && <>
        <CtxItem icon="✨" label="Marcar como Finalizado" onClick={() => { onCambiarEstado(ctxMenu.iid, "Finalizado"); onClose(); }} />
      </>}

      {ctxMenu.tipo === "aprobar" && <>
        <CtxItem icon="✅" label="Aprobar informe definitivo" onClick={() => { onCambiarEstado(ctxMenu.iid, "Aprobado"); onClose(); }} />
        <CtxItem icon="✨" label="Marcar como Finalizado" onClick={() => { onCambiarEstado(ctxMenu.iid, "Finalizado"); onClose(); }} />
        <CtxItem icon="⏪" label="Devolver a Ejecución" onClick={() => { onCambiarEstado(ctxMenu.iid, "En Proceso"); onClose(); }} />
      </>}

      {ctxMenu.tipo === "aprobados" && <>
        <CtxItem icon="✨" label="Marcar como Finalizado" onClick={() => { onCambiarEstado(ctxMenu.iid, "Finalizado"); onClose(); }} />
        <CtxItem icon="⏪" label="Devolver a En Proceso" onClick={() => { onCambiarEstado(ctxMenu.iid, "En Proceso"); onClose(); }} />
      </>}
      </div>
    </>,
    document.body
  );
}
