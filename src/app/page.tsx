"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VERSION } from "@/lib/config";
import { login, guardarSesion, obtenerSesion, type Rol } from "@/lib/auth-service";
import { iniciarSesionDemo } from "@/lib/demo-data";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { NotificationType, ImpactStyle } from "@capacitor/haptics";
import { Skeleton } from "@/components/Skeleton";
import { SplashScreen } from "@/components/SplashScreen";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem("app_theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      redirigirPorRol(sesion.rol);
    } else {
      setLoading(false);
    }
  }, []);

  function redirigirPorRol(rol: Rol) {
    switch (rol) {
      case "admin": router.push("/admin"); break;
      case "supervisor": router.push("/supervisor"); break;
      case "tecnico": router.push("/tecnico"); break;
      default: router.push("/tecnico");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Completa email y contraseña.");
      hapticNotification(NotificationType.Error);
      return;
    }

    setSubmitting(true);
    try {
      const info = await login(email.trim(), password);
      guardarSesion(info);
      hapticNotification(NotificationType.Success);
      redirigirPorRol(info.rol);
    } catch (err: unknown) {
      hapticNotification(NotificationType.Error);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Credenciales incorrectas.");
      } else {
        setError(msg);
      }
    }
    setSubmitting(false);
  }

  function handleAccesoDemo(rol: Rol) {
    hapticImpact(ImpactStyle.Light);
    iniciarSesionDemo(rol);
    hapticNotification(NotificationType.Success);
    redirigirPorRol(rol);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <SplashScreen onFinish={() => setLoading(false)} />
        <div className="card" style={{ width: '100%', maxWidth: 360, padding: 32, textAlign: 'center' }}>
          <Skeleton variant="circular" width="64px" height="64px" className="mx-auto mb-4" />
          <Skeleton variant="text" width="60%" height="2rem" className="mx-auto mb-2" />
          <Skeleton variant="text" width="40%" height="1rem" className="mx-auto mb-4" />
          <Skeleton variant="rectangular" width="100%" height="2.5rem" className="mb-2" />
          <Skeleton variant="rectangular" width="100%" height="2.5rem" className="mb-4" />
          <Skeleton variant="rectangular" width="100%" height="3rem" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: "48px 32px", textAlign: 'center', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
        
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--color-primary) 0%, #1565c0 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 24,
              boxShadow: "0 4px 12px rgba(46, 117, 182, 0.3)"
            }}>
              📋
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: "-0.5px" }}>ReportHub</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: "2px", marginTop: 4 }}>GESTIÓN DE INFORMES</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>Control y Seguimiento Operativo</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            className="input"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            autoComplete="email"
            autoFocus
            style={{ borderRadius: 8, padding: "12px 14px", border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
          />

          <input
            type="password"
            className="input"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            autoComplete="current-password"
            style={{ borderRadius: 8, padding: "12px 14px", border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
          />

          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
            onClick={() => hapticImpact(ImpactStyle.Medium)}
            style={{ padding: "12px", fontSize: 15, fontWeight: 600, borderRadius: 8, marginTop: 8 }}
          >
            {submitting ? "Cargando..." : "INGRESAR"}
          </button>
        </form>

        {/* Separador Modo Demo */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 16px', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            O prueba sin cuenta
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
        </div>

        {/* Accesos Rápidos Modo Demo */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px dashed var(--border-color)',
          borderRadius: 10,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              ⚡ Modo Demo Interactivo
            </span>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}>
              Sin Firebase
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
            Explora todas las funciones con datos de muestra precargados:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => handleAccesoDemo("tecnico")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <span>👨‍🔧</span>
              <span style={{ flex: 1 }}>Probar como Técnico</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Informes y catálogo →</span>
            </button>

            <button
              type="button"
              onClick={() => handleAccesoDemo("supervisor")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <span>👤</span>
              <span style={{ flex: 1 }}>Probar como Supervisor</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bandeja, KPIs y ZIP →</span>
            </button>

            <button
              type="button"
              onClick={() => handleAccesoDemo("admin")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <span>⚙️</span>
              <span style={{ flex: 1 }}>Probar como Administrador</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gestión usuarios →</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontWeight: 600, marginBottom: 8 }}>
            <span>Técnico</span> • <span>Supervisor</span> • <span>Admin</span>
          </div>
          <div style={{ opacity: 0.6 }}>Version {VERSION}</div>
        </div>
      </div>
    </div>
  );
}
