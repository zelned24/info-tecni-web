"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Categoria } from "@/lib/config";
import {
  getMateriales,
  getDispositivos,
  getListaNombresDisp,
  getZonasCompartidas,
  addZona,
  agregarRegistro,
  getReporteActual,
  eliminarRegistro,
} from "@/lib/store";
import { hapticImpact, hapticSelection } from "@/lib/haptics";
import { ImpactStyle } from "@capacitor/haptics";

interface TabIngresoProps {
  categoria: Categoria;
  onUpdate: () => void;
  showAlert: (msg: string) => void;
}

export function TabIngreso({ categoria, onUpdate, showAlert }: TabIngresoProps) {
  const [zona, setZona] = useState("");
  const [equipo, setEquipo] = useState("");
  const [showDispDropdown, setShowDispDropdown] = useState(false);
  const [obs, setObs] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<{ id: string; cantidad: string; selected?: boolean }[]>([]);
  const materiales = getMateriales();
  const esRecableado = categoria === "Recableados";
  const zonasHist = getZonasCompartidas();
  const [showZonaHist, setShowZonaHist] = useState(false);
  const dispList = getListaNombresDisp();
  const dispFiltrados = equipo.trim() ? dispList.filter(d => d.toLowerCase().includes(equipo.toLowerCase())) : dispList;
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"datos" | "catalogo" | "carrito">("datos");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cantidadRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const materialesFiltrados = Object.entries(materiales).filter(([, info]) =>
    info.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const reporte = getReporteActual();
  const registros = reporte[categoria] || [];

  function guardar() {
    const textoUbi = zona.trim();
    if (!textoUbi) { showAlert("Escribe una zona/ubicación."); return; }
    const nuevos = carrito.filter((it) => parseInt(it.cantidad) > 0);
    if (nuevos.length === 0) { showAlert("Añade materiales con cantidad."); return; }

    const zonas = textoUbi.split(",").map((z) => z.trim().toUpperCase()).filter(Boolean);
    const idDisp = esRecableado ? null : getListaNombresDisp().includes(equipo)
      ? Object.entries(getDispositivos()).find(([, d]) => d.nombre === equipo)?.[0] || null : null;

    for (const z of zonas) {
      addZona(z);
      for (const item of nuevos) {
        agregarRegistro(categoria, {
          ubicacion: z,
          id_dispositivo: idDisp,
          nombre_custom: idDisp ? "" : equipo,
          observacion: obs,
          id_material: item.id,
          cantidad: item.cantidad,
        });
      }
    }
    hapticImpact(ImpactStyle.Heavy);
    setCarrito([]);
    setBusqueda("");
    setEquipo("");
    setObs("");
    onUpdate();
    if (isMobile) setMobileTab("datos");
  }

  function añadirSeleccion() {
    const nuevos: { id: string; cantidad: string }[] = [];
    cantidadRefs.current.forEach((inp, id) => {
      const val = inp.value;
      if (val && parseInt(val) > 0) {
        nuevos.push({ id, cantidad: val });
        inp.value = "";
      }
    });
    if (nuevos.length > 0) {
      setCarrito((prev) => [...prev, ...nuevos]);
      hapticImpact(ImpactStyle.Medium);
      // No navegamos automáticamente: el técnico puede seguir añadiendo más materiales
    }
  }

  // ─── Secciones reutilizables ────────────────────────────────────────────────

  const seccionDatos = (
    <div className="card" style={{ padding: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
        📋 Datos del Registro
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <input className="input" placeholder="Zona(s) sugeridas o escribir..." value={zona}
            onChange={(e) => setZona(e.target.value)}
            onFocus={() => { if (zonasHist.length > 0) setShowZonaHist(true); hapticImpact(ImpactStyle.Light); }}
            onBlur={() => setTimeout(() => setShowZonaHist(false), 200)} />
          {showZonaHist && zonasHist.length > 0 && (
            <div className="card" style={{ position: "absolute", top: 40, left: 0, right: 0, zIndex: 100, maxHeight: 200, overflowY: "auto", padding: 0 }}>
              {zonasHist.map((z) => (
                <div key={z} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", fontSize: 13 }} onClick={() => { setZona(z); setShowZonaHist(false); hapticSelection(); }}>{z}</div>
              ))}
            </div>
          )}
        </div>
        {!esRecableado && (
          <div style={{ position: "relative" }}>
            <input className="input" placeholder="Buscar o escribir equipo..." value={equipo}
              onChange={(e) => { setEquipo(e.target.value); setShowDispDropdown(true); }}
              onFocus={() => { setShowDispDropdown(true); hapticImpact(ImpactStyle.Light); }}
              onBlur={() => setTimeout(() => setShowDispDropdown(false), 200)} />
            {showDispDropdown && dispFiltrados.length > 0 && (
              <div className="card" style={{ position: "absolute", top: 40, left: 0, right: 0, zIndex: 100, maxHeight: 200, overflowY: "auto", padding: 0 }}>
                {dispFiltrados.slice(0, 20).map((d) => (
                  <div key={d} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", fontSize: 13 }} onClick={() => { setEquipo(d); setShowDispDropdown(false); hapticSelection(); }}>{d}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <textarea className="input" placeholder="Observación..." value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
      </div>
      {isMobile && (
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 12, padding: "11px", fontSize: 14, fontWeight: 700, borderRadius: 6 }}
          onClick={() => setMobileTab("catalogo")}
        >
          Ir al Catálogo →
        </button>
      )}
    </div>
  );

  const seccionCarrito = (
    <div className="card" style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
        🛒 Carrito ({carrito.length})
      </h3>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {carrito.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--text-muted)", fontSize: 12, padding: "20px 0" }}>Añade materiales desde el catálogo</div>
        ) : carrito.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: it.selected ? "2px solid var(--color-warning)" : "1px solid var(--border-color)", borderRadius: 4, background: it.selected ? "rgba(255, 193, 7, 0.1)" : "var(--bg-input)", transition: "all 0.3s" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{materiales[it.id]?.nombre || it.id}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cant: {it.cantidad} {materiales[it.id]?.unidad}</div>
            </div>
            <button style={{ border: "none", background: "transparent", color: "var(--color-danger)", cursor: "pointer", fontSize: 16 }} onClick={() => { setCarrito((prev) => prev.filter((_, j) => j !== i)); }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexShrink: 0 }}>
        <button className="btn btn-outline" style={{ flex: 1, borderRadius: 4, padding: "8px", fontSize: 13 }} onClick={() => setCarrito([])}>
          🗑️ Vaciar
        </button>
        <button className="btn btn-success" style={{ flex: 2, borderRadius: 4, padding: "8px", fontSize: 13, fontWeight: 700 }} onClick={guardar}>
          💾 Guardar
        </button>
      </div>
    </div>
  );

  const seccionListaRegistros = (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
        📁 {categoria} ({registros.length})
      </h3>
      <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 4, background: "var(--bg-input)", padding: 8 }}>
        {registros.length === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>(vacío)</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(
              registros.reduce((acc, r, i) => {
                const zona = r.ubicacion || "Sin Zona";
                const dictDispositivos = getDispositivos();
                const equipo = r.id_dispositivo ? (dictDispositivos[r.id_dispositivo]?.nombre || r.id_dispositivo) : (r.nombre_custom || "General / Varios");
                if (!acc[zona]) acc[zona] = {};
                if (!acc[zona][equipo]) acc[zona][equipo] = [];
                acc[zona][equipo].push({ r, i });
                return acc;
              }, {} as Record<string, Record<string, { r: any, i: number }[]>>)
            ).map(([zona, equipos]) => (
              <details key={zona} open style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 4, overflow: "hidden" }}>
                <summary style={{ padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "rgba(46,117,182,0.05)", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6, userSelect: "none", borderBottom: "1px solid var(--border-color)" }}>
                  📁 {zona}
                </summary>
                <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(equipos).map(([equipo, items]) => (
                    <details key={equipo} open style={{ borderLeft: "2px solid var(--border-color)", paddingLeft: 12 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, userSelect: "none" }}>
                        📄 {equipo}
                      </summary>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {items.map(({ r, i: idxOriginal }) => (
                          <div key={idxOriginal} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-input)", padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border-color)", cursor: "pointer" }}
                            onClick={() => {
                              setZona(r.ubicacion || "");
                              setEquipo(r.id_dispositivo ? (getDispositivos()[r.id_dispositivo]?.nombre || r.id_dispositivo) : r.nombre_custom || "");
                              setObs(r.observacion || "");
                              const nuevosItemsCarrito = items.map(x => ({
                                id: String(x.r.id_material),
                                cantidad: String(x.r.cantidad),
                                selected: x.i === idxOriginal
                              }));
                              setCarrito(nuevosItemsCarrito);
                              const indicesAEliminar = items.map(x => x.i).sort((a, b) => b - a);
                              indicesAEliminar.forEach(idx => eliminarRegistro(categoria, idx));
                              onUpdate();
                              if (isMobile) setMobileTab("carrito");
                            }}
                            title="Haz clic para editar todos los materiales de este equipo"
                          >
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)" }}>{materiales[String(r.id_material)]?.nombre || r.id_material}</div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cant: {r.cantidad} {materiales[String(r.id_material)]?.unidad}</div>
                            </div>
                            <button style={{ border: "none", background: "transparent", color: "var(--color-danger)", cursor: "pointer", fontSize: 14, padding: "4px 8px" }}
                              onClick={(e) => { e.stopPropagation(); eliminarRegistro(categoria, idxOriginal); onUpdate(); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const seccionCatalogo = (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
        📦 Catálogo
      </h3>
      <input className="input" placeholder="🔎 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ marginBottom: 8, background: "var(--bg-input)" }} />

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: isMobile ? 100 : 40 }}>
        {materialesFiltrados.map(([id, info]) => (
          <div key={id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-color)", gap: 12 }}>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
              {info.nombre} <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({info.unidad})</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              ref={(el) => { if (el) cantidadRefs.current.set(id, el); else cantidadRefs.current.delete(id); }}
              style={{ width: 60, height: 36, textAlign: "center", border: "1px solid var(--border-color)", borderRadius: 4, background: "var(--bg-input)", fontWeight: 600, fontSize: 15 }}
            />
          </div>
        ))}
      </div>

      {/* Botones del catálogo — apilados en mobile */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 6, padding: "8px 16px 16px", background: "var(--bg-card)", borderTop: isMobile ? "1px solid var(--border-color)" : "none" }}>
        {isMobile && carrito.length > 0 && (
          <button
            className="btn btn-success"
            style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 700, borderRadius: 6 }}
            onClick={() => setMobileTab("carrito")}
          >
            🛒 Ver Carrito ({carrito.length}) →
          </button>
        )}
        <button className="btn btn-danger" style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 800, borderRadius: 4 }} onClick={añadirSeleccion}>
          ⬇️ AÑADIR SELECCIÓN
        </button>
      </div>
    </div>
  );

  // ─── Vista MOBILE ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Barra de tabs mobile */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", background: "var(--bg-card)", flexShrink: 0 }}>
          {([
            { key: "datos",    label: "📋 Datos" },
            { key: "catalogo", label: "📦 Catálogo" },
            { key: "carrito",  label: `🛒 (${carrito.length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMobileTab(key)}
              style={{
                flex: 1,
                padding: "10px 4px",
                fontSize: 12,
                fontWeight: mobileTab === key ? 700 : 500,
                color: mobileTab === key ? "var(--color-primary)" : "var(--text-muted)",
                background: "transparent",
                border: "none",
                borderBottom: mobileTab === key ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: -2,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña activa */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {mobileTab === "datos" && (
            <>
              {seccionDatos}
              {seccionListaRegistros}
            </>
          )}
          {mobileTab === "catalogo" && seccionCatalogo}
          {mobileTab === "carrito" && seccionCarrito}
        </div>
      </div>
    );
  }

  // ─── Vista DESKTOP (sin cambios) ──────────────────────────────────────────────
  return (
    <div className="layout-grid">

      {/* Columna 1: Datos del Registro + Carrito */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
        {seccionDatos}
        {seccionCarrito}
      </div>

      {/* Columna 2: Lista de la Categoria */}
      {seccionListaRegistros}

      {/* Columna 3: Catálogo */}
      {seccionCatalogo}

    </div>
  );
}
