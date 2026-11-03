"use client";

import React from "react";
import { ESTADO_COLORES } from "@/lib/config";

interface ReportVisualizerProps {
  report: any;
  materiales: any;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}

export const ReportVisualizer: React.FC<ReportVisualizerProps> = ({ report, materiales, onApprove, onReject, onEdit }) => {
  if (!report) return null;

  const meta = report.metadatos || {};
  const datos = report.datos || {};
  const color = ESTADO_COLORES[report.estado]?.fg || "var(--text-primary)";

  return (
    <div className="visualizer-container">
      {/* Header Info */}
      <div className="report-card main-info">
        <div className="status-indicator" style={{ background: color }} />
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">AGENCIA</span>
            <span className="meta-value">{meta.agencia || "---"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">TÉCNICO</span>
            <span className="meta-value">{meta.tecnico || "---"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">FECHA</span>
            <span className="meta-value">{meta.fecha || "---"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">ESTADO</span>
            <span className="meta-value badge" style={{ color }}>{report.estado}</span>
          </div>
        </div>
      </div>

      {/* Data Sections */}
      {Object.entries(datos).map(([cat, registros]: [string, any]) => (
        registros.length > 0 && (
          <div key={cat} className="category-section">
            <h4 className="category-title">{cat}</h4>
            <div className="registros-stack">
              {registros.map((reg: any, i: number) => (
                <div key={i} className="report-card registro-card">
                  <div className="reg-header">
                    <span className="reg-ubi">📍 {reg.ubicacion}</span>
                    <span className="reg-disp">{reg.id_dispositivo || reg.nombre_custom || "Genérico"}</span>
                  </div>
                  <div className="reg-body">
                    <div className="reg-mat">
                      <span className="mat-name">{materiales[reg.id_material]?.nombre || reg.id_material}</span>
                      <span className="mat-qty">{reg.cantidad} {materiales[reg.id_material]?.unidad}</span>
                    </div>
                    {reg.observacion && (
                      <p className="reg-obs"><span>Nota:</span> {reg.observacion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {/* Action Bar */}
      <div className="action-bar-visualizer">
        {onEdit && <button className="btn-action edit" onClick={onEdit}>✏️ Editar</button>}
        {onReject && <button className="btn-action reject" onClick={onReject}>✕ Rechazar</button>}
        {onApprove && <button className="btn-action approve" onClick={onApprove}>✅ Aprobar</button>}
      </div>

      <style jsx>{`
        .visualizer-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-bottom: 80px;
        }

        .report-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 16px;
          box-shadow: var(--shadow-card);
        }

        .main-info {
          position: relative;
          overflow: hidden;
        }

        .status-indicator {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .meta-value {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .meta-value.badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 6px;
          width: fit-content;
        }

        .category-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-primary-light);
          margin: 0 0 12px 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .registros-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .registro-card {
          padding: 12px 16px;
          border-radius: 16px;
        }

        .reg-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .reg-ubi {
          font-size: 13px;
          font-weight: 800;
          color: white;
        }

        .reg-disp {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .reg-mat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mat-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .mat-qty {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-primary-light);
        }

        .reg-obs {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-muted);
          background: rgba(0, 0, 0, 0.2);
          padding: 8px;
          border-radius: 8px;
        }

        .reg-obs span { font-weight: 800; color: var(--color-warning); }

        .action-bar-visualizer {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 400px;
          display: flex;
          gap: 12px;
          z-index: 10;
        }

        .btn-action {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 16px;
          font-weight: 800;
          color: white;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .edit { background: var(--bg-input); }
        .reject { background: var(--color-danger); }
        .approve { background: var(--color-success); }

        @media (max-width: 480px) {
          .meta-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
