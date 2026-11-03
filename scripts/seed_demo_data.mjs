/**
 * scripts/seed_demo_data.mjs
 * Script para inicializar datos de demostración en Firebase Firestore.
 * 
 * Uso:
 *   1. Asegúrate de configurar tu archivo .env.local con las credenciales de Firebase.
 *   2. Ejecuta: npm run seed
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de .env.local manualmente si existen
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      process.env[key.trim()] = vals.join("=").trim();
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Faltan credenciales de Firebase en .env.local (NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID)");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── 1. MATERIALES DE EJEMPLO ────────────────────────────────────────────────
const MATERIALES_DEMO = [
  { id: "mat_01", nombre: "Cable UTP Cat 6 (metros)", unidad: "MTR" },
  { id: "mat_02", nombre: "Conector RJ-45 Cat 6", unidad: "UND" },
  { id: "mat_03", nombre: "Canaleta 20x10 con adhesivo", unidad: "TRAMO" },
  { id: "mat_04", nombre: "Canaleta 40x25 para pared", unidad: "TRAMO" },
  { id: "mat_05", nombre: "Caja de paso plástica 100x100", unidad: "UND" },
  { id: "mat_06", nombre: "Jack RJ-45 Hembra", unidad: "UND" },
  { id: "mat_07", nombre: "Patch Cord 1 metro", unidad: "UND" },
  { id: "mat_08", nombre: "Patch Cord 2 metros", unidad: "UND" },
  { id: "mat_09", nombre: "Cintillos de seguridad 150mm", unidad: "BOLSA" },
  { id: "mat_10", nombre: "Tacos Fisher con tornillo 1/4", unidad: "JGO" },
];

// ── 2. DISPOSITIVOS / EQUIPOS DE EJEMPLO ────────────────────────────────────
const DISPOSITIVOS_DEMO = [
  { id: "disp_01", nombre: "Cámara IP Domo 4MP", categoria: "CCTV" },
  { id: "disp_02", nombre: "Cámara IP Tubo Exterior", categoria: "CCTV" },
  { id: "disp_03", nombre: "Switch de Red 24 Puertos PoE", categoria: "Redes" },
  { id: "disp_04", nombre: "Switch de Distribución 8 Puertos", categoria: "Redes" },
  { id: "disp_05", nombre: "Router Gateway Principal", categoria: "Redes" },
  { id: "disp_06", nombre: "Panel de Alarma Contra Incendio", categoria: "Seguridad" },
  { id: "disp_07", nombre: "Sensor de Humo Fotoeléctrico", categoria: "Seguridad" },
  { id: "disp_08", nombre: "Lector Biométrico de Acceso", categoria: "Control Acceso" },
  { id: "disp_09", nombre: "Electroimán para Puerta", categoria: "Control Acceso" },
  { id: "disp_10", nombre: "Punto de Red / Estación de Trabajo", categoria: "Puntos" },
];

// ── 3. SEDES / SUCURSALES DE EJEMPLO ────────────────────────────────────────
const AGENCIAS_DEMO = [
  { id: "ag_01", nombre: "Sede Principal - Centro", departamento: "Lima", direccion: "Av. Principal 123" },
  { id: "ag_02", nombre: "Sucursal Norte - Planta 1", departamento: "Lima", direccion: "Calle Los Cedros 450" },
  { id: "ag_03", nombre: "Sucursal Sur - Distribución", departamento: "Lima", direccion: "Av. Sur 890" },
  { id: "ag_04", nombre: "Almacén General de Envíos", departamento: "Callao", direccion: "Av. Industrial 234" },
  { id: "ag_05", nombre: "Oficina Regional Arequipa", departamento: "Arequipa", direccion: "Calle Mercaderes 102" },
];

async function sembrarDatos() {
  console.log("🚀 Iniciando carga de datos de demostración a Firestore...");

  // Cargar Materiales
  console.log("\n📦 Sembrando materiales...");
  for (const m of MATERIALES_DEMO) {
    const { id, ...data } = m;
    await setDoc(doc(db, "materiales", id), data);
    console.log(`  ✓ Material: ${m.nombre}`);
  }

  // Cargar Dispositivos
  console.log("\n🔧 Sembrando dispositivos / equipos...");
  for (const d of DISPOSITIVOS_DEMO) {
    const { id, ...data } = d;
    await setDoc(doc(db, "dispositivos", id), data);
    console.log(`  ✓ Dispositivo: ${d.nombre}`);
  }

  // Cargar Agencias/Sedes
  console.log("\n🏢 Sembrando agencias / sedes...");
  for (const a of AGENCIAS_DEMO) {
    const { id, ...data } = a;
    await setDoc(doc(db, "agencias", id), data);
    console.log(`  ✓ Sede: ${a.nombre}`);
  }

  console.log("\n✨ ¡Datos de demostración inicializados con éxito!");
  console.log("Puedes ingresar a la aplicación y los catálogos estarán disponibles para registrar informes.");
  process.exit(0);
}

sembrarDatos().catch((err) => {
  console.error("❌ Error al sembrar datos:", err);
  process.exit(1);
});

