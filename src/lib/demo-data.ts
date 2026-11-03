/**
 * lib/demo-data.ts — Datos de demostración y utilidades para el Modo Demo.
 * Permite explorar la aplicación completa sin necesidad de configurar Firebase.
 */

import type { DocumentData } from "firebase/firestore";
import type { UsuarioInfo, Rol } from "./auth-service";

export function esModoDemo(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("app_demo_mode") === "true";
}

export function iniciarSesionDemo(rol: Rol): UsuarioInfo {
  const nombres: Record<Rol, string> = {
    tecnico: "Carlos Técnico (Demo)",
    supervisor: "María Supervisora (Demo)",
    admin: "Administrador Demo",
  };

  const info: UsuarioInfo = {
    uid: `demo-uid-${rol}`,
    nombre: nombres[rol],
    email: `${rol}@demo.com`,
    rol,
    activo: true,
  };

  localStorage.setItem("app_demo_mode", "true");
  localStorage.setItem("app_session_usuario", info.nombre);
  localStorage.setItem("app_session_rol", info.rol);
  localStorage.setItem("app_session_uid", info.uid);

  // Inicializar colecciones demo en localStorage si no existen
  if (!localStorage.getItem("app_demo_informes")) {
    localStorage.setItem("app_demo_informes", JSON.stringify(DEMO_INFORMES));
  }
  if (!localStorage.getItem("app_demo_solicitudes")) {
    localStorage.setItem("app_demo_solicitudes", JSON.stringify(DEMO_SOLICITUDES));
  }
  if (!localStorage.getItem("app_demo_usuarios")) {
    localStorage.setItem("app_demo_usuarios", JSON.stringify(DEMO_USUARIOS));
  }

  return info;
}

export function cerrarSesionDemo(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("app_demo_mode");
  localStorage.removeItem("app_session_usuario");
  localStorage.removeItem("app_session_rol");
  localStorage.removeItem("app_session_uid");
}

export function obtenerDemoInformes(): Record<string, DocumentData> {
  if (typeof window === "undefined") return DEMO_INFORMES;
  try {
    const raw = localStorage.getItem("app_demo_informes");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_INFORMES;
}

export function guardarDemoInformes(data: Record<string, DocumentData>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("app_demo_informes", JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("app_demo_sync", { detail: { type: "informes", data } }));
}

export function obtenerDemoSolicitudes(): Record<string, DocumentData> {
  if (typeof window === "undefined") return DEMO_SOLICITUDES;
  try {
    const raw = localStorage.getItem("app_demo_solicitudes");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_SOLICITUDES;
}

export function guardarDemoSolicitudes(data: Record<string, DocumentData>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("app_demo_solicitudes", JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("app_demo_sync", { detail: { type: "solicitudes", data } }));
}

export function obtenerDemoUsuarios(): UsuarioInfo[] {
  if (typeof window === "undefined") return DEMO_USUARIOS;
  try {
    const raw = localStorage.getItem("app_demo_usuarios");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_USUARIOS;
}

export function guardarDemoUsuarios(data: UsuarioInfo[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("app_demo_usuarios", JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("app_demo_sync", { detail: { type: "usuarios", data } }));
}

export const DEMO_MATERIALES: Record<string, { nombre: string; unidad: string }> = {
  mat_01: { nombre: "Cable UTP Cat 6 (metros)", unidad: "MTR" },
  mat_02: { nombre: "Conector RJ-45 Cat 6 Blindado", unidad: "UND" },
  mat_03: { nombre: "Canaleta 20x10 con adhesivo", unidad: "TRAMO" },
  mat_04: { nombre: "Canaleta 40x25 para pared", unidad: "TRAMO" },
  mat_05: { nombre: "Caja de paso plástica 100x100", unidad: "UND" },
  mat_06: { nombre: "Jack RJ-45 Hembra Cat 6", unidad: "UND" },
  mat_07: { nombre: "Patch Cord 1 metro azul", unidad: "UND" },
  mat_08: { nombre: "Patch Cord 2 metros gris", unidad: "UND" },
  mat_09: { nombre: "Cintillos de seguridad 150mm", unidad: "BOLSA" },
  mat_10: { nombre: "Tacos Fisher con tornillo 1/4", unidad: "JGO" },
  mat_11: { nombre: "Cinta aislante 3M", unidad: "ROLLO" },
  mat_12: { nombre: "Fuente de poder 12V 5A", unidad: "UND" },
};

export const DEMO_DISPOSITIVOS: Record<string, { nombre: string; materiales_vinculados?: string[] }> = {
  disp_01: { nombre: "Cámara IP Domo 4MP", materiales_vinculados: ["mat_01", "mat_02", "mat_07"] },
  disp_02: { nombre: "Cámara IP Tubo Exterior 4MP", materiales_vinculados: ["mat_01", "mat_02", "mat_05"] },
  disp_03: { nombre: "Switch 24 Puertos PoE Administrable", materiales_vinculados: ["mat_07", "mat_08"] },
  disp_04: { nombre: "Switch 8 Puertos Distribución", materiales_vinculados: ["mat_07"] },
  disp_05: { nombre: "Router Gateway Principal", materiales_vinculados: ["mat_08"] },
  disp_06: { nombre: "Panel Central de Alarma", materiales_vinculados: ["mat_01", "mat_09"] },
  disp_07: { nombre: "Sensor de Humo Fotoeléctrico", materiales_vinculados: ["mat_09", "mat_10"] },
  disp_08: { nombre: "Lector Biométrico de Huella y Tarjeta", materiales_vinculados: ["mat_01", "mat_12"] },
  disp_09: { nombre: "Electroimán 600 lbs para Puerta", materiales_vinculados: ["mat_10", "mat_12"] },
  disp_10: { nombre: "Punto de Red / Estación Operativa", materiales_vinculados: ["mat_01", "mat_03", "mat_06"] },
};

export const DEMO_AGENCIAS: string[] = [
  "Sede Central - Torre Empresarial",
  "Sucursal Norte - Centro Operativo",
  "Sucursal Sur - Distribución",
  "Almacén General Logístico",
  "Oficina Regional Arequipa",
  "Oficina Regional Trujillo",
  "Planta Industrial Este",
];

export const DEMO_USUARIOS: UsuarioInfo[] = [
  { uid: "demo-usr-1", nombre: "Carlos Mendoza", email: "carlos.mendoza@empresa.com", rol: "tecnico", activo: true },
  { uid: "demo-usr-2", nombre: "Juan Pérez", email: "juan.perez@empresa.com", rol: "tecnico", activo: true },
  { uid: "demo-usr-3", nombre: "María Morales", email: "maria.morales@empresa.com", rol: "supervisor", activo: true },
  { uid: "demo-usr-4", nombre: "David Silva", email: "david.silva@empresa.com", rol: "supervisor", activo: true },
  { uid: "demo-usr-5", nombre: "Administrador Demo", email: "admin@empresa.com", rol: "admin", activo: true },
];

export const DEMO_INFORMES: Record<string, DocumentData> = {
  inf_demo_01: {
    metadatos: {
      agencia: "Sede Central - Torre Empresarial",
      tecnico: "Carlos Mendoza",
      fecha: "28/10/2026",
    },
    estado: "Finalizado",
    supervisor: "María Morales",
    tecnicos_asignados: ["Carlos Mendoza", "Juan Pérez"],
    datos: {
      Correctivo: [
        {
          id_dispositivo: "disp_01",
          ubicacion: "Hall Principal",
          observacion: "Lente sucio y conector flojo. Se reemplazó RJ-45",
          id_material: "mat_02",
          cantidad: "2",
        },
        {
          id_dispositivo: "disp_03",
          ubicacion: "Rack de Comunicaciones",
          observacion: "Patch cord deteriorado en puerto 12",
          id_material: "mat_07",
          cantidad: "1",
        },
      ],
      Recableados: [
        {
          id_dispositivo: "disp_10",
          ubicacion: "Atención al Cliente",
          observacion: "Reemplazo de tramo de canaleta dañado",
          id_material: "mat_03",
          cantidad: "2",
        },
        {
          id_dispositivo: "disp_10",
          ubicacion: "Atención al Cliente",
          observacion: "Tirada de cable Cat6",
          id_material: "mat_01",
          cantidad: "15",
        },
      ],
    },
  },
  inf_demo_02: {
    metadatos: {
      agencia: "Sucursal Norte - Centro Operativo",
      tecnico: "Juan Pérez",
      fecha: "29/10/2026",
    },
    estado: "En Proceso",
    supervisor: "David Silva",
    tecnicos_asignados: ["Juan Pérez"],
    datos: {
      "Instalaciones Nuevas": [
        {
          id_dispositivo: "disp_08",
          ubicacion: "Ingreso Personal",
          observacion: "Instalación de nuevo biométrico de acceso",
          id_material: "mat_01",
          cantidad: "20",
        },
        {
          id_dispositivo: "disp_09",
          ubicacion: "Ingreso Personal",
          observacion: "Fijación y prueba de electroimán",
          id_material: "mat_10",
          cantidad: "1",
        },
      ],
    },
  },
  inf_demo_03: {
    metadatos: {
      agencia: "Sucursal Sur - Distribución",
      tecnico: "Carlos Mendoza",
      fecha: "27/10/2026",
    },
    estado: "Pendiente",
    supervisor: "Sin Asignar",
    tecnicos_asignados: [],
    datos: {
      Correctivo: [
        {
          id_dispositivo: "disp_07",
          ubicacion: "Almacén Cajas",
          observacion: "Sensor de humo con falso contacto intermitente",
          id_material: "mat_09",
          cantidad: "1",
        },
      ],
    },
  },
  inf_demo_04: {
    metadatos: {
      agencia: "Almacén General Logístico",
      tecnico: "Juan Pérez",
      fecha: "25/10/2026",
    },
    estado: "Aprobado",
    supervisor: "María Morales",
    tecnicos_asignados: ["Juan Pérez"],
    datos: {
      Recableados: [
        {
          id_dispositivo: "disp_04",
          ubicacion: "Oficina Despacho",
          observacion: "Reorganización de cableado y patch cords certificados",
          id_material: "mat_08",
          cantidad: "4",
        },
      ],
    },
  },
  inf_demo_05: {
    metadatos: {
      agencia: "Oficina Regional Arequipa",
      tecnico: "Carlos Mendoza",
      fecha: "26/10/2026",
    },
    estado: "En Espera de Aprobación",
    supervisor: "David Silva",
    tecnicos_asignados: ["Carlos Mendoza"],
    datos: {
      Correctivo: [
        {
          id_dispositivo: "disp_02",
          ubicacion: "Fachada Principal",
          observacion: "Cámara exterior sin señal. Se selló caja de paso estanca",
          id_material: "mat_05",
          cantidad: "1",
        },
      ],
    },
  },
  inf_demo_06: {
    metadatos: {
      agencia: "Planta Industrial Este",
      tecnico: "Juan Pérez",
      fecha: "24/10/2026",
    },
    estado: "Finalizado",
    supervisor: "María Morales",
    tecnicos_asignados: ["Juan Pérez"],
    datos: {
      "Instalaciones Nuevas": [
        {
          id_dispositivo: "disp_06",
          ubicacion: "Caseta de Vigilancia",
          observacion: "Pase de canaleta y fijación de panel",
          id_material: "mat_04",
          cantidad: "3",
        },
      ],
    },
  },
};

export const DEMO_SOLICITUDES: Record<string, DocumentData> = {
  sol_demo_01: {
    fecha: "29/10/2026",
    agencia: "Sucursal Norte - Centro Operativo",
    tecnico: "Juan Pérez",
    estado: "Pendiente",
    materiales: [
      { nombre: "Cable UTP Cat 6 (metros)", cantidad: 50, unidad: "MTR" },
      { nombre: "Conector RJ-45 Cat 6 Blindado", cantidad: 10, unidad: "UND" },
    ],
    comentario: "Urgente para completar cableado de zona norte.",
  },
  sol_demo_02: {
    fecha: "28/10/2026",
    agencia: "Sede Central - Torre Empresarial",
    tecnico: "Carlos Mendoza",
    estado: "En Proceso",
    materiales: [
      { nombre: "Canaleta 40x25 para pared", cantidad: 5, unidad: "TRAMO" },
    ],
    comentario: "Aprobado por supervisor. Pendiente recojo en almacén.",
  },
};
