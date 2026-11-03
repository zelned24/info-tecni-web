/**
 * lib/firestore-service.ts — Capa de datos Firestore.
 * Adaptado a la estructura REAL de la base de datos:
 *   /materiales/{id}   → { nombre, unidad }
 *   /dispositivos/{id} → { nombre, ... }
 *   /agencias/{id}     → { nombre, departamento, ... }
 *   /informes/{id}     → { metadatos, datos, estado, supervisor, ... }
 *   /solicitudes/{id}  → { fecha, agencia, estado, ... }
 *   /usuarios/{uid}    → { email, nombre, rol, activo }
 *   /catalogo/{nombre} → LEGACY: { items: {...} } o { lista: [...] }
 */
import { db } from "./firebase";
import { GOOGLE_SHEETS_ID } from "./config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

// ─── CRUD Genérico ───────────────────────────────────────────────────────────

export async function getDocument(
  collectionName: string,
  docId: string
): Promise<DocumentData | null> {
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error(`[Firestore] getDocument(${collectionName}/${docId}):`, e);
    return null;
  }
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData
): Promise<boolean> {
  try {
    await setDoc(doc(db, collectionName, docId), data);
    return true;
  } catch (e) {
    console.error(`[Firestore] setDocument(${collectionName}/${docId}):`, e);
    return false;
  }
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  fields: Partial<DocumentData>
): Promise<boolean> {
  try {
    await updateDoc(doc(db, collectionName, docId), fields);
    return true;
  } catch (e) {
    console.error(`[Firestore] updateDocument(${collectionName}/${docId}):`, e);
    return false;
  }
}

export async function addDocument(
  collectionName: string,
  data: DocumentData
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, collectionName), data);
    return ref.id;
  } catch (e) {
    console.error(`[Firestore] addDocument(${collectionName}):`, e);
    return null;
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (e) {
    console.error(`[Firestore] deleteDocument(${collectionName}/${docId}):`, e);
    return false;
  }
}

export async function listCollection(
  collectionName: string
): Promise<Record<string, DocumentData>> {
  const result: Record<string, DocumentData> = {};
  try {
    const snap = await getDocs(query(collection(db, collectionName)));
    snap.forEach((d) => {
      result[d.id] = d.data();
    });
  } catch (e) {
    console.error(`[Firestore] listCollection(${collectionName}):`, e);
  }
  return result;
}

// ─── Listeners en Tiempo Real ────────────────────────────────────────────────

export function onCollectionChange(
  collectionName: string,
  callback: (data: Record<string, DocumentData>) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, collectionName)),
    (snap) => {
      const result: Record<string, DocumentData> = {};
      snap.forEach((d) => {
        result[d.id] = d.data();
      });
      callback(result);
    },
    (error) => {
      console.error(
        `[Firestore] onCollectionChange(${collectionName}):`,
        error
      );
    }
  );
}

// ─── Helpers de Config ───────────────────────────────────────────────────────

/** Lee /config/sistema → {version_actual, link_descarga} */
export async function obtenerConfigSistema(): Promise<DocumentData> {
  return (await getDocument("config", "sistema")) || {};
}

/** Lee /config/app_config */
export async function obtenerAppConfig(): Promise<DocumentData> {
  return (await getDocument("config", "app_config")) || {};
}

/** Lee /cuentas/* → {nombre: {password, activo, rol}} */
export async function obtenerCuentasSupervisores(): Promise<
  Record<string, DocumentData>
> {
  return listCollection("cuentas");
}

// ─── Catálogos ───────────────────────────────────────────────────────────────
// La DB real usa colecciones raíz: /materiales/{id}, /dispositivos/{id}
// Cada doc es un material/dispositivo individual.
// Fallback: intenta /catalogo/{nombre} (formato legacy de la app Python).

/**
 * Obtiene un catálogo.
 *  - "materiales"   → lee /materiales/* → {id: {nombre, unidad}}
 *  - "dispositivos" → lee /dispositivos/* → {id: {nombre, ...}}
 *  - "supervisores" → lee /catalogo/supervisores → lista
 *  - otros          → lee /catalogo/{nombre} → items o lista
 */
export async function obtenerCatalogo(
  nombre: string
): Promise<DocumentData> {
  // Materiales y dispositivos son colecciones raíz
  if (nombre === "materiales" || nombre === "dispositivos") {
    const datos = await listCollection(nombre);
    // Si la colección raíz tiene docs, usarla
    if (Object.keys(datos).length > 0) {
      return datos;
    }
    // Fallback: formato legacy /catalogo/{nombre} → { items: {...} }
    const docData = await getDocument("catalogo", nombre);
    if (docData) return docData.items || docData.lista || {};
    return {};
  }

  // Supervisores y otros: /catalogo/{nombre}
  const docData = await getDocument("catalogo", nombre);
  if (!docData) return {};
  return docData.items || docData.lista || {};
}

/** Guarda /catalogo/{nombre} (formato legacy) */
export async function guardarCatalogo(
  nombre: string,
  datos: DocumentData
): Promise<boolean> {
  if (Array.isArray(datos)) {
    return setDocument("catalogo", nombre, { lista: datos });
  }
  return setDocument("catalogo", nombre, { items: datos });
}

// ─── Agencias (colección raíz) ───────────────────────────────────────────────

export async function obtenerAgencias(): Promise<
  Record<string, DocumentData>
> {
  return listCollection("agencias");
}

/** Devuelve solo los nombres de agencias como lista plana */
export async function obtenerListaAgencias(): Promise<string[]> {
  const datos = await listCollection("agencias");
  return Object.values(datos)
    .map((d) => d.nombre || "")
    .filter(Boolean)
    .sort();
}

/** Devuelve la lista combinada de agencias (Firestore + Google Sheets opcional) */
export async function obtenerAgenciasCompletas(): Promise<string[]> {
  const agsFirestore = await obtenerListaAgencias();
  if (!GOOGLE_SHEETS_ID) {
    return agsFirestore;
  }
  let agsSheets: string[] = [];
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(GOOGLE_SHEETS_ID)}/export?format=csv`;
    const res = await fetch(sheetUrl);
    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n");
      const agenciasSet = new Set<string>();
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length > 1) {
          let name = cols[1].trim();
          if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1).replace(/""/g, '"');
          }
          if (name) agenciasSet.add(name);
        }
      }
      agsSheets = Array.from(agenciasSet);
    }
  } catch (err) {
    console.warn("[Agencias] Sincronización opcional de Google Sheets no disponible:", err);
  }

  return Array.from(new Set([...agsFirestore, ...agsSheets])).sort();
}


// ─── Informes ────────────────────────────────────────────────────────────────

export async function obtenerInformes(): Promise<
  Record<string, DocumentData>
> {
  return listCollection("informes");
}

export async function obtenerInformesPorTecnico(tecnico: string): Promise<Record<string, DocumentData>> {
  const result: Record<string, DocumentData> = {};
  try {
    const q = query(collection(db, "informes"), where("metadatos.tecnico", "==", tecnico));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      result[d.id] = d.data();
    });
  } catch (e) {
    console.error(`[Firestore] obtenerInformesPorTecnico:`, e);
  }
  return result;
}

export async function marcarInformeEliminado(iid: string, motivo: string): Promise<boolean> {
  const entradaHistorial = {
    fecha_mod: new Date().toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    tecnico: "Supervisor", // This can be improved if we pass supervisor's name, but fine for now
    tipo: "eliminación",
    descripcion: `Eliminado: ${motivo}`,
  };

  try {
    const docActual = await getDocument("informes", iid);
    const histPrev = docActual?.modificaciones || [];
    const nuevasModif = [...histPrev, entradaHistorial];

    return await updateDocument("informes", iid, {
      estado: "Eliminado",
      motivo_eliminacion: motivo,
      modificaciones: nuevasModif
    });
  } catch (e) {
    console.error(`[Firestore] marcarInformeEliminado(${iid}):`, e);
    return false;
  }
}

export async function exportarInforme(
  agencia: string,
  tecnico: string,
  fecha: string,
  reporteActual: Record<string, unknown[]>,
  idNubeActual: string | null,
  descripcionCambio: string = "Envío inicial"
): Promise<{ ok: boolean; id: string | null }> {
  const entradaHistorial = {
    fecha_mod: new Date().toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    tecnico,
    tipo: idNubeActual ? "edición" : "creación",
    descripcion: descripcionCambio,
  };

  const nowISO = new Date().toISOString();
  const paquete: DocumentData = {
    metadatos: { agencia, tecnico, fecha },
    datos: reporteActual,
    estado: "Pendiente",
    supervisor: "Sin Asignar",
    created_at: nowISO,
    updated_at: nowISO,
  };

  try {
    if (idNubeActual) {
      const docActual = await getDocument("informes", idNubeActual);
      const histPrev = docActual?.modificaciones || [];
      paquete.modificaciones = [...histPrev, entradaHistorial];
      // Preservar estado, supervisor y created_at existentes
      if (docActual?.estado) paquete.estado = docActual.estado;
      if (docActual?.supervisor) paquete.supervisor = docActual.supervisor;
      if (docActual?.created_at) paquete.created_at = docActual.created_at;
      const ok = await setDocument("informes", idNubeActual, paquete);
      return { ok, id: idNubeActual };
    } else {
      paquete.modificaciones = [entradaHistorial];
      const nid = await addDocument("informes", paquete);
      return { ok: !!nid, id: nid };
    }
  } catch (e) {
    console.error("[Firestore] exportarInforme:", e);
    return { ok: false, id: null };
  }
}

export async function actualizarCampoInforme(
  iid: string,
  campos: Partial<DocumentData>
): Promise<boolean> {
  return updateDocument("informes", iid, campos);
}

export async function eliminarInforme(iid: string): Promise<boolean> {
  return deleteDocument("informes", iid);
}

// ─── Solicitudes ─────────────────────────────────────────────────────────────

export async function obtenerSolicitudes(): Promise<
  Record<string, DocumentData>
> {
  return listCollection("solicitudes");
}

export async function agregarSolicitud(
  datos: DocumentData
): Promise<string | null> {
  return addDocument("solicitudes", datos);
}

export async function actualizarSolicitud(
  iid: string,
  campos: Partial<DocumentData>
): Promise<boolean> {
  return updateDocument("solicitudes", iid, campos);
}

export async function eliminarSolicitud(iid: string): Promise<boolean> {
  return deleteDocument("solicitudes", iid);
}


// ─── Agencias Track ──────────────────────────────────────────────────────────

export async function obtenerAgenciasTrack(): Promise<
  Record<string, DocumentData>
> {
  return listCollection("agencias_track");
}

export async function guardarAgenciaTrack(
  agId: string,
  datos: DocumentData
): Promise<boolean> {
  return setDocument("agencias_track", agId, datos);
}

// ─── Asignación de Técnicos a Informes ───────────────────────────────────────

/**
 * Asigna técnicos a un informe. Guarda un array de nombres en el campo
 * `tecnicos_asignados`. Es independiente del campo `supervisor`.
 */
export async function asignarTecnicos(
  iid: string,
  tecnicos: string[]
): Promise<boolean> {
  return updateDocument("informes", iid, { tecnicos_asignados: tecnicos });
}

/**
 * Obtiene la lista de nombres de usuarios con rol "tecnico" o "admin".
 * Útil para el selector de asignación.
 */
export async function obtenerListaTecnicos(): Promise<string[]> {
  const usuarios = await listCollection("usuarios");
  return Object.values(usuarios)
    .filter((u) => u.rol === "tecnico")
    .map((u) => u.nombre || u.email)
    .filter(Boolean)
    .sort();
}
