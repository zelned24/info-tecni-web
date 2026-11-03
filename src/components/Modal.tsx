import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "alert" | "confirm" | "danger" | "prompt";
  inputValue?: string;
  onInputChange?: (val: string) => void;
  inputPlaceholder?: string;
}

export function Modal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  type = "alert",
  inputValue,
  onInputChange,
  inputPlaceholder = "Escribe aquí...",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "var(--space-md)",
      animation: "fadeIn 0.2s ease-out"
    }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", animation: "slideUp 0.2s ease-out" }}>
        <h3 style={{ marginBottom: "var(--space-sm)", fontSize: "var(--font-size-lg)" }}>
          {type === "danger" ? "⚠️ " : type === "confirm" ? "❓ " : type === "prompt" ? "⌨️ " : "ℹ️ "}
          {title}
        </h3>
        <div style={{ marginBottom: type === "prompt" ? "var(--space-sm)" : "var(--space-lg)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {message}
        </div>
        {type === "prompt" && onInputChange && (
          <input 
            className="input" 
            style={{ marginBottom: "var(--space-lg)", width: "100%" }}
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
          />
        )}
        <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "flex-end" }}>
          {type !== "alert" && onCancel && (
            <button className="btn btn-outline" onClick={onCancel}>{cancelText}</button>
          )}
          <button 
            className={`btn ${type === "danger" ? "btn-danger" : "btn-primary"}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
