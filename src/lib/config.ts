/**
 * lib/config.ts — Configuración centralizada de la aplicación
 */

export const VERSION = "1.0.0-template";

export const CATEGORIAS = ["Correctivo", "Instalaciones Nuevas", "Recableados"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const ESTADOS_INFORME = [
  "Pendiente",
  "En Proceso",
  "En Espera de Aprobación",
  "Previo Creado",
  "Asignado",
  "Finalizado",
  "Aprobado",
  "Eliminado",
] as const;
export type EstadoInforme = (typeof ESTADOS_INFORME)[number];

export const ESTADOS_SOLICITUD = [
  "Pendiente",
  "En Proceso",
  "Completado",
  "Rechazado",
] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

// Colores por estado (bg, border, fg)
export const ESTADO_COLORES: Record<
  string,
  { bg: string; border: string; fg: string }
> = {
  Pendiente:               { bg: "#FFF3CD", border: "#F0A500", fg: "#856404" },
  "En Proceso":            { bg: "#E8F4FD", border: "#2196F3", fg: "#0d47a1" },
  "En Espera de Aprobación": { bg: "#F3E5F5", border: "#9C27B0", fg: "#4a148c" },
  "Previo Creado":         { bg: "#D1ECF1", border: "#17A2B8", fg: "#0c5460" },
  Asignado:                { bg: "#FFE0E0", border: "#E53935", fg: "#b71c1c" },
  Finalizado:              { bg: "#1B5E20", border: "#1B5E20", fg: "#ffffff" },
  Aprobado:                { bg: "#C8E6C9", border: "#2E7D32", fg: "#1B5E20" },
  Eliminado:               { bg: "#ffebee", border: "#ef5350", fg: "#c62828" },
};

// Hash SHA-256 de la contraseña para operaciones de eliminación (previene leak en texto plano en el bundle)
// Valor por defecto: SHA-256 de 'Admin2026.'
export const PASS_ELIMINAR_HASH =
  process.env.NEXT_PUBLIC_PASS_ELIMINAR_HASH ||
  "5f374b2b3cc70bc1eded67a87b82cc5b78fa53c0b4b38c2a831ef60d834d3046";

export async function validarPassEliminar(input: string): Promise<boolean> {
  if (!input) return false;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex.toLowerCase() === PASS_ELIMINAR_HASH.toLowerCase();
  } catch {
    return false;
  }
}

// Google Sheets opcional (para sincronización de sedes/agencias)
export const GOOGLE_SHEETS_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID || "";
export const GOOGLE_SHEETS_TAB = "TABLA";
export const GOOGLE_SHEETS_COLUMN = 2; // Columna B
