"use client";

import React, { useEffect, useState } from "react";

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExit(true);
      setTimeout(onFinish, 800); // Wait for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-container ${exit ? "exit" : ""}`}>
      <div className="logo-box animate-logo">
        <div className="logo-icon">📋</div>
        <h1 className="logo-text">INFORMES TÉCNICOS</h1>
        <div className="logo-glow" />
      </div>

      <style jsx>{`
        .splash-container {
          position: fixed;
          inset: 0;
          background: #0f0f1a;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .splash-container.exit {
          opacity: 0;
          transform: scale(1.1);
          pointer-events: none;
        }

        .logo-box {
          position: relative;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .logo-icon {
          font-size: 80px;
          filter: drop-shadow(0 0 20px rgba(46, 117, 182, 0.5));
        }

        .logo-text {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 6px;
          color: white;
          margin: 0;
          background: linear-gradient(135deg, #ffffff 0%, #4FC3F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(46, 117, 182, 0.2) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          z-index: -1;
        }
      `}</style>
    </div>
  );
};
