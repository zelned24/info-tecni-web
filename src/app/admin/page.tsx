"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  obtenerSesion, logout,
  listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuarioDB, enviarCorreoReset,
  type UsuarioInfo, type Rol,
} from "@/lib/auth-service";
import { Modal } from "@/components/Modal";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function AdminPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<{ nombre: string; rol: Rol; uid: string } | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Form nuevo usuario
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoRol, setNuevoRol] = useState<Rol>("tecnico");
  const [creando, setCreando] = useState(false);
  const [showCrearUsuario, setShowCrearUsuario] = useState(false);
  const [msg, setMsg] = useState("");

  const [modal, setModal] = useState<{isOpen: boolean, type: "alert"|"confirm"|"danger", title: string, msg: string, action: () => void} | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s || s.rol !== "admin") {
      router.push("/");
      return;
    }
    setSesion(s);
    setDarkMode(localStorage.getItem("app_theme") === "dark");
    cargarUsuarios();
  }, [router]);

  async function cargarUsuarios() {
    setCargando(true);
    const lista = await listarUsuarios();
    setUsuarios(lista);
    setCargando(false);
  }

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("app_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEmail || !nuevoPass || !nuevoNombre) { setMsg("⚠️ Completa todos los campos."); return; }
    if (nuevoPass.length < 6) { setMsg("⚠️ La contraseña debe tener mínimo 6 caracteres."); return; }

    setCreando(true);
    setMsg("");
    try {
      await crearUsuario(nuevoEmail.trim(), nuevoPass, nuevoNombre.trim(), nuevoRol);
      setMsg("✅ Usuario creado exitosamente.");
      setNuevoEmail(""); setNuevoPass(""); setNuevoNombre(""); setNuevoRol("tecnico");
      cargarUsuarios();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Error";
      if (m.includes("email-already-in-use")) setMsg("⚠️ Este email ya tiene una cuenta.");
      else setMsg("❌ " + m);
    }
    setCreando(false);
  }

  async function toggleActivo(u: UsuarioInfo) {
    await actualizarUsuario(u.uid, { activo: !u.activo });
    cargarUsuarios();
  }

  async function cambiarRol(u: UsuarioInfo, rol: Rol) {
    await actualizarUsuario(u.uid, { rol });
    cargarUsuarios();
  }

  function eliminar(u: UsuarioInfo) {
    setModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Usuario",
      msg: `¿Eliminar el registro de ${u.nombre}?\n(Solo borra el perfil en Firestore, no la cuenta de Auth)`,
      action: async () => {
        await eliminarUsuarioDB(u.uid);
        cargarUsuarios();
        setModal(null);
      }
    });
  }

  function resetPassword(u: UsuarioInfo) {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Restablecer Contraseña",
      msg: `¿Enviar un correo a ${u.email} con un enlace para restablecer su contraseña?`,
      action: async () => {
        const ok = await enviarCorreoReset(u.email);
        setModal({
          isOpen: true,
          type: "alert",
          title: "Resultado",
          msg: ok ? "✅ Correo enviado exitosamente." : "❌ Error al enviar el correo. Verifica que el correo sea válido.",
          action: () => setModal(null)
        });
      }
    });
  }

  async function handleLogout() {
    await logout();
    window.location.href = "/";
  }

  const [menuOpen, setMenuOpen] = useState(false);

  if (!sesion) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden" }}>
      {/* Header Compacto Moderno */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", zIndex: 10 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(p => !p); }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🏢</span>
            <h1 className="mobile-hide" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)", whiteSpace: "nowrap", userSelect: "none" }}>
              Administración — {sesion.nombre} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </h1>
            <span className="desktop-hide" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "none" }}>
              {sesion.nombre} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </span>
          </div>

          {menuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} />
              <div className="desktop-hide" style={{ position: "absolute", top: "100%", left: 0, marginTop: 12, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", minWidth: 180, zIndex: 100, padding: 8, gap: 4 }}>
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/supervisor")}>📊 Ir a Supervisor</button>
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/tecnico")}>👨‍🔧 Ir a Técnico</button>
                <div style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--color-danger)", cursor: "pointer", borderRadius: 6 }} onClick={handleLogout}>🚪 Cerrar sesión</button>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div className="mobile-hide" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
          <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-info)", color: "var(--color-info)", whiteSpace: "nowrap" }} onClick={() => router.push("/supervisor")}>
            Ir a Supervisor
          </button>
          <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-info)", color: "var(--color-info)", whiteSpace: "nowrap" }} onClick={() => router.push("/tecnico")}>
            Ir a Técnico
          </button>
          <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-danger)", color: "var(--color-danger)", whiteSpace: "nowrap" }} onClick={handleLogout}>
            Cerrar sesión
          </button>
          </div>
          <button className="btn btn-outline" style={{ padding: "4px", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--border-color)", color: "var(--text-primary)" }} onClick={toggleDark}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
        <div className="admin-grid" style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Crear usuario */}
          <div className="card animate-fade-in" style={{ borderTop: "4px solid var(--color-primary)", flexShrink: 0, height: "fit-content" }}>
            <h2 
              className="desktop-hide"
              style={{ fontSize: 16, margin: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => setShowCrearUsuario(!showCrearUsuario)}
            >
              <span>➕ Crear nuevo usuario</span>
              <span style={{ fontSize: 12 }}>{showCrearUsuario ? "▲" : "▼"}</span>
            </h2>
            <h2 className="mobile-hide" style={{ fontSize: 16, margin: 0, marginBottom: 20 }}>
              ➕ Crear nuevo usuario
            </h2>
            
            <div className={showCrearUsuario ? "" : "mobile-hide"}>
              <form onSubmit={handleCrear} style={{ marginTop: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input className="input" placeholder="Nombre completo" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="input" type="email" placeholder="correo@empresa.com" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Contraseña</label>
                    <input className="input" type="password" placeholder="Mín. 6 caracteres" value={nuevoPass} onChange={(e) => setNuevoPass(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Rol</label>
                    <select className="select" value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as Rol)}>
                      <option value="tecnico">👨‍🔧 Técnico</option>
                      <option value="supervisor">👤 Supervisor</option>
                      <option value="admin">⚙️ Administrador</option>
                    </select>
                  </div>
                </div>
                {msg && <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: msg.startsWith("✅") ? "var(--color-success)" : "var(--color-danger)" }}>{msg}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary btn-lg" style={{ padding: "10px 32px" }} disabled={creando}>
                    {creando ? "⏳ Creando…" : "💾 CREAR USUARIO"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="card animate-fade-in" style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontSize: 16 }}>👥 Usuarios registrados ({usuarios.length})</h2>
              <button className="btn btn-outline btn-sm" onClick={cargarUsuarios}>🔄 Actualizar</button>
            </div>
            {cargando ? (
              <div style={{ textAlign: "center", padding: 60 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
            ) : (
              <>
                {/* Desktop: Table */}
                <div className="table-container mobile-hide" style={{ flex: 1, overflowY: "auto", minHeight: 0, margin: "-16px", padding: "16px" }}>
                  <table className="table">
                    <thead>
                      <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => (
                        <tr key={u.uid}>
                          <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                          <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{u.email}</td>
                          <td>
                            <select className="select" style={{ width: 120, padding: "4px 8px", fontSize: 11 }}
                              value={u.rol} onChange={(e) => cambiarRol(u, e.target.value as Rol)}>
                              <option value="tecnico">👨‍🔧 Técnico</option>
                              <option value="supervisor">👤 Supervisor</option>
                              <option value="admin">⚙️ Admin</option>
                            </select>
                          </td>
                          <td>
                            <button className="badge"
                              style={{ cursor: "pointer", background: u.activo ? "rgba(76,175,80,0.1)" : "rgba(229,57,53,0.1)",
                                color: u.activo ? "var(--color-success)" : "var(--color-danger)",
                                borderColor: u.activo ? "var(--color-success)" : "var(--color-danger)", fontSize: 10 }}
                              onClick={() => toggleActivo(u)}>
                              {u.activo ? "✅ Activo" : "🚫 Inactivo"}
                            </button>
                          </td>
                          <td style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => resetPassword(u)} title="Restablecer Contraseña">
                              📧 Reset
                            </button>
                            {u.uid !== sesion.uid && (
                              <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 10 }} onClick={() => eliminar(u)} title="Eliminar">
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Card list */}
                <div className="mobile-user-cards desktop-hide" style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 16 }}>
                  {usuarios.map((u) => (
                    <div key={u.uid} className="card" style={{
                      marginBottom: 12, padding: 16,
                      borderLeft: `4px solid ${u.activo ? "var(--color-success)" : "var(--color-danger)"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{u.nombre}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{u.email}</div>
                        </div>
                        <button className="badge"
                          style={{
                            cursor: "pointer", flexShrink: 0,
                            background: u.activo ? "rgba(76,175,80,0.15)" : "rgba(229,57,53,0.15)",
                            color: u.activo ? "var(--color-success)" : "var(--color-danger)",
                            borderColor: u.activo ? "var(--color-success)" : "var(--color-danger)",
                            fontSize: 11, padding: "4px 10px",
                          }}
                          onClick={() => toggleActivo(u)}>
                          {u.activo ? "✅ Activo" : "🚫 Inactivo"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <select className="select" style={{ flex: 1, minWidth: 100, padding: "8px 10px", fontSize: 13 }}
                          value={u.rol} onChange={(e) => cambiarRol(u, e.target.value as Rol)}>
                          <option value="tecnico">👨‍🔧 Técnico</option>
                          <option value="supervisor">👤 Supervisor</option>
                          <option value="admin">⚙️ Admin</option>
                        </select>
                        <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => resetPassword(u)}>
                          📧 Reset
                        </button>
                        {u.uid !== sesion.uid && (
                          <button className="btn btn-danger" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => eliminar(u)}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {modal && (
        <Modal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.msg}
          type={modal.type || "confirm"}
          onConfirm={modal.action}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

