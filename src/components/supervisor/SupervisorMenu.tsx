"use client";

import React from "react";
import { hapticImpact, hapticSelection } from "@/lib/haptics";
import { ImpactStyle } from "@capacitor/haptics";

interface SupervisorMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: "Dashboard" | "Bandeja" | "Solicitudes" | "Agencias") => void;
  onLogout: () => void;
}

export const SupervisorMenu: React.FC<SupervisorMenuProps> = ({ isOpen, onClose, onSelectTab, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div className="menu-overlay" onClick={onClose}>
      <div className="menu-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">
          <h3>Opciones</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="menu-list">
          <button className="menu-item" onClick={() => { onSelectTab("Agencias"); onClose(); hapticSelection(); }}>
            <span className="icon">🏢</span> Directorio de Agencias
          </button>
          <button className="menu-item" onClick={() => { onSelectTab("Solicitudes"); onClose(); hapticSelection(); }}>
            <span className="icon">🔔</span> Ver Solicitudes
          </button>
          <div className="menu-divider" />
          <button className="menu-item logout" onClick={() => { onLogout(); onClose(); hapticImpact(ImpactStyle.Heavy); }}>
            <span className="icon">🚪</span> Cerrar Sesión
          </button>
        </div>
      </div>

      <style jsx>{`
        .menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .menu-content {
          background: var(--bg-card);
          width: 100%;
          max-width: 500px;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px;
          padding-bottom: calc(24px + var(--safe-area-bottom));
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
        }

        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .menu-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .close-btn {
          background: var(--bg-input);
          border: none;
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
        }

        .menu-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .menu-item:active {
          transform: scale(0.98);
          background: var(--bg-card-hover);
        }

        .menu-item .icon {
          font-size: 20px;
        }

        .menu-divider {
          height: 1px;
          background: var(--border-color);
          margin: 8px 0;
        }

        .menu-item.logout {
          color: var(--color-danger);
          border-color: rgba(229, 57, 53, 0.2);
        }
      `}</style>
    </div>
  );
};
