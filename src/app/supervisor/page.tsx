"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ESTADOS_INFORME, validarPassEliminar } from "@/lib/config";
import {
  obtenerInformes,
  obtenerSolicitudes,
  obtenerCatalogo,
  actualizarCampoInforme,
  marcarInformeEliminado,
  onCollectionChange,
  listCollection,
  asignarTecnicos as asignarTecnicosFB,
  obtenerListaTecnicos,
  obtenerAgenciasCompletas,
} from "@/lib/firestore-service";
import { setListaAgencias } from "@/lib/store";
import { obtenerSesion, logout } from "@/lib/auth-service";
import type { DocumentData } from "firebase/firestore";
import { Modal } from "@/components/Modal";

// Sub-componentes extraídos
import { DashboardTab } from "@/components/supervisor/DashboardTab";
import { BandejaTab } from "@/components/supervisor/BandejaTab";
import { SolicitudesTab } from "@/components/supervisor/SolicitudesTab";
import { SupervisorMenu } from "@/components/supervisor/SupervisorMenu";
import { BottomSheet } from "@/components/BottomSheet";
import { ReportVisualizer } from "@/components/supervisor/ReportVisualizer";
import { hapticImpact, hapticNotification, hapticSelection } from "@/lib/haptics";
import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Skeleton } from "@/components/Skeleton";

type TabSup = "Dashboard" | "Bandeja" | "Solicitudes";

export default function SupervisorPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabSup>("Dashboard");
  const [showMenu, setShowMenu] = useState(false);
  const [reporteAbierto, setReporteAbierto] = useState<string | null>(null);
  const [usuario, setUsuario] = useState("Supervisor");
  const [informes, setInformes] = useState<Record<string, DocumentData>>({});
  const [solicitudes, setSolicitudes] = useState<Record<string, DocumentData>>({});
  const [materiales, setMateriales] = useState<Record<string, DocumentData>>({});
  const [dispositivos, setDispositivos] = useState<Record<string, DocumentData>>({});
  const [supervisores, setSupervisores] = useState<string[]>([]);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [agencias, setAgencias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [iidSel, setIidSel] = useState<string | null>(null);
  const [sesion, setSesion] = useState<{ nombre: string; rol: string; uid: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [darkMode, setDarkMode] = useState(false);

  // Modal State
  const [modal, setModal] = useState<{ isOpen: boolean, type: "alert" | "prompt" | "confirm" | "danger", title: string, msg: string, inputVal: string, action: (val?: string) => void } | null>(null);
  const showAlert = (msg: string) => {
    hapticNotification(NotificationType.Warning);
    setModal({ isOpen: true, type: "alert", title: "Aviso", msg, inputVal: "", action: () => setModal(null) });
  };

  useEffect(() => {
    const s = obtenerSesion();
    if (!s || !["supervisor", "admin"].includes(s.rol)) {
      router.push("/"); return;
    }
    setSesion(s);
    setUsuario(s.nombre);
    setDarkMode(localStorage.getItem("app_theme") === "dark");
    cargarTodo();
  }, [router]);

  // Real-time listener
  useEffect(() => {
    const unsub = onCollectionChange("informes", (data) => {
      setInformes(data);
    });
    return () => unsub();
  }, []);

  async function cargarTodo() {
    try {
      const [inf, sol, mats, disps, usuariosRaw, tecList, agList] = await Promise.all([
        obtenerInformes(), obtenerSolicitudes(),
        obtenerCatalogo("materiales"), obtenerCatalogo("dispositivos"),
        listCollection("usuarios"),
        obtenerListaTecnicos(),
        obtenerAgenciasCompletas(),
      ]);
      setInformes(inf); setSolicitudes(sol);
      setMateriales(mats as Record<string, DocumentData>);
      setDispositivos(disps as Record<string, DocumentData>);
      setTecnicos(tecList);
      setAgencias(agList);
      if (agList.length > 0) setListaAgencias(agList);

      const supList = Object.values(usuariosRaw)
        .filter(u => u.rol === "supervisor" || u.rol === "admin")
        .map(u => u.nombre || u.email);
      setSupervisores(supList.length > 0 ? supList : ["Sin Asignar"]);
    } catch (e) { console.error("[Supervisor]", e); }
    setCargando(false);
  }

  async function cambiarEstado(iid: string, nuevo: string) {
    try {
      const entradaHistorial = {
        fecha_mod: new Date().toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        tecnico: usuario,
        tipo: "cambio_estado",
        descripcion: `Estado cambiado a: ${nuevo}`
      };
      const docActual = informes[iid];
      const histPrev = docActual?.modificaciones || [];
      const nuevasModif = [...histPrev, entradaHistorial];
      const ok = await actualizarCampoInforme(iid, { estado: nuevo, modificaciones: nuevasModif });
      if (ok) {
        setInformes((prev) => ({ ...prev, [iid]: { ...prev[iid], estado: nuevo, modificaciones: nuevasModif } }));
        hapticNotification(NotificationType.Success);
      } else {
        showAlert("❌ No se pudo actualizar el estado en el servidor.");
      }
    } catch (err) {
      console.error("Error cambiando estado:", err);
      showAlert("❌ Error de red al cambiar estado.");
    }
  }

  async function asignarSup(iid: string, nombre: string) {
    await actualizarCampoInforme(iid, { supervisor: nombre });
    setInformes((prev) => ({ ...prev, [iid]: { ...prev[iid], supervisor: nombre } }));
    hapticImpact(ImpactStyle.Medium);
    showAlert(`✅ Informe asignado a ${nombre}`);
  }

  async function handleAsignarTecnicos(iid: string, listaTecnicos: string[]) {
    const ok = await asignarTecnicosFB(iid, listaTecnicos);
    if (ok) {
      setInformes((prev) => ({ ...prev, [iid]: { ...prev[iid], tecnicos_asignados: listaTecnicos } }));
      hapticImpact(ImpactStyle.Medium);
    } else {
      showAlert("❌ Error al asignar técnicos.");
    }
  }

  function eliminarInformeHandler(iid: string) {
    hapticNotification(NotificationType.Warning);
    setModal({
      isOpen: true, type: "prompt", title: "Eliminar Informe", msg: "Introduce la contraseña para eliminar:", inputVal: "",
      action: async (val) => {
        const esValido = await validarPassEliminar(val || "");
        if (!esValido) { showAlert("Contraseña incorrecta."); return; }
        
        // Pide motivo en otro prompt
        setTimeout(() => {
          setModal({
            isOpen: true, type: "prompt", title: "Motivo de eliminación", msg: "Escribe el motivo por el que se elimina el informe:", inputVal: "",
            action: async (motivo) => {
              if (!motivo || motivo.trim() === "") { showAlert("Debe ingresar un motivo válido."); return; }
              setModal(null);
              const ok = await marcarInformeEliminado(iid, motivo);
              if (ok) {
                // Al cambiar el estado a Eliminado y quitarlo del Dashboard, simplemente lo removemos del state local o le seteamos el estado para que se filtre.
                // Como pidieron que NO aparezca en la bandeja, lo removemos igual que antes
                setInformes((prev) => { const n = { ...prev }; delete n[iid]; return n; });
                hapticNotification(NotificationType.Success);
              } else {
                showAlert("Error al marcar el informe como eliminado.");
              }
            }
          });
        }, 100);
      }
    });
  }

  if (cargando) {
    return (
      <div className="page-container" style={{ padding: "var(--space-md)" }}>
        <Skeleton variant="text" width="60%" height="2rem" />
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Skeleton variant="rectangular" width="100%" height="6rem" />
          <Skeleton variant="rectangular" width="100%" height="6rem" />
          <Skeleton variant="rectangular" width="100%" height="6rem" />
          <Skeleton variant="rectangular" width="100%" height="6rem" />
        </div>
        <div style={{ marginTop: 24 }}>
          <Skeleton variant="rectangular" width="100%" height="20rem" />
        </div>
      </div>
    );
  }

  // Stats
  const conteo: Record<string, number> = {};
  ESTADOS_INFORME.forEach((e) => (conteo[e] = 0));
  Object.values(informes).forEach((pq) => { const e = pq.estado || "Pendiente"; conteo[e] = (conteo[e] || 0) + 1; });
  const total = Object.values(conteo).reduce((a, b) => a + b, 0);

  return (
    <div className="page-container" style={{ padding: 0, paddingBottom: 0, background: "var(--bg-primary)", boxSizing: "border-box" }}>
      {/* Top Navbar */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 12px", background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        gap: 8
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(p => !p); }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📊</span>
            <h1 className="mobile-hide" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--color-primary)", whiteSpace: "nowrap", userSelect: "none" }}>
              Seguimiento — {sesion?.nombre} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </h1>
            <span className="desktop-hide" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "none" }}>
              {sesion?.nombre} <span style={{ fontSize: 10, opacity: 0.6, verticalAlign: "middle" }}>▼</span>
            </span>
          </div>

          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }} />
              <div className="desktop-hide" style={{ position: "absolute", top: "100%", left: 0, marginTop: 12, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", minWidth: 180, zIndex: 100, padding: 8, gap: 4 }}>
                {sesion?.rol === "admin" && (
                  <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/admin")}>⚙️ Ir a Admin</button>
                )}
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer", borderRadius: 6 }} onClick={() => router.push("/tecnico")}>👨‍🔧 Ir a Técnico</button>
                <div style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />
                <button style={{ background: "transparent", border: "none", textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--color-danger)", cursor: "pointer", borderRadius: 6 }} onClick={async () => { await logout(); router.push("/"); }}>🚪 Cerrar sesión</button>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div className="mobile-hide" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
            {sesion?.rol === "admin" && (
              <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-primary)", color: "var(--color-primary)", whiteSpace: "nowrap" }} onClick={() => router.push("/admin")}>
                ⚙️ Admin
              </button>
            )}
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-primary)", color: "var(--color-primary)", whiteSpace: "nowrap" }} onClick={() => router.push("/tecnico")}>
              👨‍🔧 Técnico
            </button>
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20, borderColor: "var(--color-danger)", color: "var(--color-danger)", whiteSpace: "nowrap" }} onClick={async () => { await logout(); router.push("/"); }}>
              Cerrar sesión
            </button>
          </div>
          <button className="btn btn-outline" style={{ padding: "4px", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--border-color)", color: "var(--text-primary)" }} onClick={() => {
            const next = !darkMode; setDarkMode(next);
            localStorage.setItem("app_theme", next ? "dark" : "light");
            document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
            hapticImpact(ImpactStyle.Light);
          }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: "var(--bg-card)", padding: "0 24px", borderBottom: "1px solid var(--border-color)" }}>
        <div className="tabs" style={{ gap: 24, borderBottom: "none", overflow: "visible" }}>
          {(["Dashboard", "Bandeja", "Solicitudes"] as TabSup[]).map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              style={{ fontSize: 10, padding: "6px 0", marginBottom: 0 }}
              onClick={() => { setTab(t); hapticSelection(); }}
            >
              {t === "Dashboard" && "📊 "}
              {t === "Bandeja" && "📁 "}
              {t === "Solicitudes" && "🔔 "}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
        {tab === "Dashboard" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <DashboardTab
              conteo={conteo} total={total} informes={informes} solicitudes={solicitudes}
              supervisores={supervisores} tecnicos={tecnicos}
              materiales={materiales} dispositivos={dispositivos}
              cambiarEstado={cambiarEstado} asignarSup={asignarSup} asignarTecnicos={handleAsignarTecnicos}
              eliminarInforme={eliminarInformeHandler}
              onOpenReport={(iid) => { setIidSel(iid); setTab("Bandeja"); }}
              setTab={setTab} setIidSel={setIidSel} setFiltroEstado={setFiltroEstado}
              busqueda={busqueda} setBusqueda={setBusqueda} filtroEstado={filtroEstado}
            />
          </div>
        )}
        {tab === "Bandeja" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <BandejaTab
              informes={informes} materiales={materiales} dispositivos={dispositivos}
              supervisores={supervisores} tecnicos={tecnicos}
              busqueda={busqueda} setBusqueda={setBusqueda}
              filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
              iidSel={iidSel} setIidSel={setIidSel}
              cambiarEstado={cambiarEstado} asignarSup={asignarSup}
              asignarTecnicos={handleAsignarTecnicos} eliminar={eliminarInformeHandler}
            />
          </div>
        )}
        {tab === "Solicitudes" && (
          <div className="animate-fade-in">
            <SolicitudesTab solicitudes={solicitudes} setSolicitudes={setSolicitudes} agencias={agencias} tecnicos={tecnicos} />
          </div>
        )}
      </main>

      {/* Report Visualizer (Bottom Sheet) */}
      <BottomSheet
        isOpen={!!reporteAbierto}
        onClose={() => setReporteAbierto(null)}
        title="Detalle del Informe"
      >
        <ReportVisualizer
          report={reporteAbierto ? informes[reporteAbierto] : null}
          materiales={materiales}
          onApprove={() => {
            if (reporteAbierto) {
              cambiarEstado(reporteAbierto, "Aprobado");
              setReporteAbierto(null);
            }
          }}
          onReject={() => {
            if (reporteAbierto) {
              cambiarEstado(reporteAbierto, "Rechazado");
              setReporteAbierto(null);
            }
          }}
        />
      </BottomSheet>

      {/* Modal / Action Dialog */}

      {modal && (
        <Modal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.msg}
          type={modal.type}
          inputValue={modal.inputVal}
          onInputChange={(val) => setModal({ ...modal, inputVal: val })}
          onConfirm={() => {
            if (modal.type === "prompt") { modal.action(modal.inputVal); }
            else { modal.action(); }
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
