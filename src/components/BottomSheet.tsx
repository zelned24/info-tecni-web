"use client";

import React, { useEffect, useState, useRef } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, height = "80vh" }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsAnimating(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setIsAnimating(false);
      setTimeout(() => {
        setIsRendered(false);
        document.body.style.overflow = "";
      }, 400);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      currentY.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (currentY.current > 100) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    currentY.current = 0;
  };

  if (!isRendered) return null;

  return (
    <div className={`bs-overlay ${isAnimating ? "active" : ""}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`bs-content ${isAnimating ? "active" : ""}`}
        style={{ height }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bs-handle-wrapper">
          <div className="bs-handle" />
        </div>

        {title && (
          <div className="bs-header">
            <h3>{title}</h3>
            <button className="bs-close" onClick={onClose}>✕</button>
          </div>
        )}

        <div className="bs-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .bs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0);
          backdrop-filter: blur(0px);
          z-index: 3000;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          pointer-events: none;
        }

        .bs-overlay.active {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          pointer-events: auto;
        }

        .bs-content {
          background: var(--bg-primary);
          width: 100%;
          max-width: 600px;
          border-top-left-radius: 32px;
          border-top-right-radius: 32px;
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
          display: flex;
          flex-direction: column;
          box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .bs-content.active {
          transform: translateY(0);
        }

        .bs-handle-wrapper {
          padding: 12px;
          display: flex;
          justify-content: center;
          cursor: grab;
        }

        .bs-handle {
          width: 40px;
          height: 4px;
          background: var(--border-color);
          border-radius: 2px;
          opacity: 0.5;
        }

        .bs-header {
          padding: 0 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bs-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .bs-close {
          background: var(--bg-input);
          border: none;
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-weight: 800;
          cursor: pointer;
        }

        .bs-body {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px 40px;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 480px) {
          .bs-content { border-radius: 32px 32px 0 0; }
        }
      `}</style>
    </div>
  );
};
