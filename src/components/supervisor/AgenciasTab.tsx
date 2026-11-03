"use client";

import React from "react";
import type { DocumentData } from "firebase/firestore";

interface AgenciasTabProps {
  informes: Record<string, DocumentData>;
}

export function AgenciasTab({ informes }: AgenciasTabProps) {
  const porAg: Record<string, DocumentData[]> = {};
  Object.values(informes).forEach((pq) => {
    const ag = pq.metadatos?.agencia || "?";
    (porAg[ag] = porAg[ag] || []).push(pq);
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-md)" }}>
        {Object.entries(porAg).sort().map(([ag, pqs]) => {
          const totalAg = pqs.length;
          const fin = pqs.filter((p) => p.estado === "Finalizado").length;
          const pct = totalAg > 0 ? Math.round((fin / totalAg) * 100) : 0;
          const color = pct === 100 ? "var(--color-success)" : pct > 50 ? "var(--color-info)" : "var(--color-warning)";
          return (
            <div key={ag} className="card">
              <h4 style={{ fontSize: "var(--font-size-sm)", marginBottom: 8 }}>🏢 {ag}</h4>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>📊 {totalAg} informe(s) · {pct}% completado</p>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
