import React from "react";

interface TrackingPanelProps {
  titulo: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function TrackingPanel({ titulo, color, count, children }: TrackingPanelProps) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <div style={{ background: color, color: "white", padding: "8px 14px", fontWeight: 700, fontSize: "var(--font-size-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{titulo}</span>
        <span style={{ background: "rgba(255,255,255,0.25)", padding: "2px 10px", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)" }}>{count}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-card)", padding: "var(--space-sm)", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
