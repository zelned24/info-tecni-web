/**
 * lib/store.ts — Estado global de la aplicación.
 * Maneja el estado del reporte actual, catálogos y offline queue.
 * Usa localStorage/IndexedDB para persistir datos offline.
 */
import type { Registro } from "./report-engine";
import type { Categoria } from "./config";
import { CATEGORIAS } from "./config";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ReporteActual {
  Correctivo: Registro[];
  "Instalaciones Nuevas": Registro[];
  Recableados: Registro[];
}

export interface HistorialItem {
  fecha: string;
  agencia: string;
  estado: string;
  id_nube?: string | null;
  paquete?: Record<string, unknown>;
}

// ─── Estado en Memoria ───────────────────────────────────────────────────────

let reporteActual: ReporteActual = {
  Correctivo: [],
  "Instalaciones Nuevas": [],
  Recableados: [],
};

let idNubeActual: string | null = null;
let materiales: Record<string, { nombre: string; unidad: string }> = {};
let dispositivos: Record<string, { nombre: string; materiales_vinculados?: string[] }> = {};
let listaNombresDisp: string[] = [];
let listaAgenciasNube: string[] = [];
let zonasCompartidas: string[] = [];

// ─── Getters ─────────────────────────────────────────────────────────────────

export function getReporteActual(): ReporteActual {
  return reporteActual;
}

export function getIdNubeActual(): string | null {
  return idNubeActual;
}

export function setIdNubeActual(id: string | null): void {
  idNubeActual = id;
}

export function getMateriales(): Record<string, { nombre: string; unidad: string }> {
  return materiales;
}

export function setMateriales(m: Record<string, { nombre: string; unidad: string }>): void {
  materiales = m;
}

export function getDispositivos(): Record<string, { nombre: string; materiales_vinculados?: string[] }> {
  return dispositivos;
}

export function setDispositivos(d: Record<string, { nombre: string; materiales_vinculados?: string[] }>): void {
  dispositivos = d;
  listaNombresDisp = ["-- Ninguno / Material Suelto --"];
  for (const info of Object.values(d)) {
    if (info && typeof info === "object" && info.nombre) {
      listaNombresDisp.push(info.nombre);
    }
  }
}

export function getListaNombresDisp(): string[] {
  return listaNombresDisp;
}

export function getListaAgencias(): string[] {
  return listaAgenciasNube;
}

export function setListaAgencias(a: string[]): void {
  listaAgenciasNube = a;
}

export function getZonasCompartidas(): string[] {
  return zonasCompartidas;
}

export function addZona(zona: string): void {
  if (zona && !zonasCompartidas.includes(zona)) {
    zonasCompartidas.unshift(zona);
  }
}

// ─── Operaciones del Reporte ─────────────────────────────────────────────────

export function agregarRegistro(categoria: Categoria, registro: Registro): void {
  reporteActual[categoria].push(registro);
  guardarReporteLocal();
}

export function eliminarRegistro(categoria: Categoria, idx: number): void {
  reporteActual[categoria].splice(idx, 1);
  guardarReporteLocal();
}

export function limpiarReporte(): void {
  for (const cat of CATEGORIAS) {
    reporteActual[cat] = [];
  }
  idNubeActual = null;
  zonasCompartidas = [];
  limpiarReporteLocal();
}

export function cargarReporteDesdeData(datos: Record<string, Registro[]>): void {
  for (const cat of CATEGORIAS) {
    reporteActual[cat] = datos[cat] || [];
  }
  guardarReporteLocal();
}

// ─── Persistencia Local (Offline) ────────────────────────────────────────────

const STORAGE_KEY_REPORTE = "app_reporte_actual";
const STORAGE_KEY_HISTORIAL = "app_historial";
const STORAGE_KEY_OFFLINE_QUEUE = "app_offline_queue";

function guardarReporteLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTE, JSON.stringify({
      reporte: reporteActual,
      idNube: idNubeActual,
      zonas: zonasCompartidas,
    }));
  } catch (e) {
    console.error("[Store] Error guardando reporte local:", e);
  }
}

function limpiarReporteLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_REPORTE);
  } catch (e) {
    console.error("[Store] Error limpiando reporte local:", e);
  }
}

export function restaurarReporteLocal(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTE);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.reporte) {
      reporteActual = data.reporte;
      idNubeActual = data.idNube || null;
      zonasCompartidas = data.zonas || [];
      return true;
    }
  } catch (e) {
    console.error("[Store] Error restaurando reporte:", e);
  }
  return false;
}

// ─── Historial Local ─────────────────────────────────────────────────────────

export function obtenerHistorial(): HistorialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function agregarHistorial(item: HistorialItem): void {
  const historial = obtenerHistorial();
  const existente = historial.findIndex(
    (h) =>
      (item.id_nube && h.id_nube === item.id_nube) ||
      (h.agencia === item.agencia && h.fecha === item.fecha && h.estado.includes("Pendiente"))
  );

  if (existente >= 0) {
    historial[existente] = { ...historial[existente], ...item };
  } else {
    historial.push(item);
  }

  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
  } catch (e) {
    console.error("[Store] Error guardando historial:", e);
  }
}

export function eliminarDeHistorial(idNube: string): void {
  const historial = obtenerHistorial();
  const nuevo = historial.filter((h) => h.id_nube !== idNube);
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(nuevo));
  } catch (e) {
    console.error("[Store] Error eliminando del historial:", e);
  }
}

// ─── Cola Offline ────────────────────────────────────────────────────────────

export interface OfflineQueueItem {
  tipo: "informe" | "solicitud";
  datos: Record<string, unknown>;
  timestamp: string;
}

export function agregarAColaOffline(item: OfflineQueueItem): void {
  try {
    const queue = obtenerColaOffline();
    queue.push(item);
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error("[Store] Error agregando a cola offline:", e);
  }
}

export function obtenerColaOffline(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function limpiarColaOffline(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
  } catch (e) {
    console.error("[Store] Error limpiando cola offline:", e);
  }
}
