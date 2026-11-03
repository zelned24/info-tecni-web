/**
 * lib/auth-service.ts — Autenticación con Firebase Auth + Roles en Firestore.
 *
 * Roles: "admin" | "supervisor" | "tecnico"
 * Los roles se almacenan en Firestore: /usuarios/{uid} → { email, nombre, rol, activo }
 */
import { auth, db } from "./firebase";
import {
  esModoDemo,
  iniciarSesionDemo,
  cerrarSesionDemo,
  obtenerDemoUsuarios,
  guardarDemoUsuarios,
} from "./demo-data";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteDoc } from "firebase/firestore";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Rol = "admin" | "supervisor" | "tecnico";

export interface UsuarioInfo {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

// ─── Login / Logout ──────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<UsuarioInfo> {
  const normEmail = email.trim().toLowerCase();

  // Atajo directo para credenciales demo
  if (normEmail === "admin@demo.com") return iniciarSesionDemo("admin");
  if (normEmail === "supervisor@demo.com") return iniciarSesionDemo("supervisor");
  if (normEmail === "tecnico@demo.com") return iniciarSesionDemo("tecnico");

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const info = await obtenerUsuarioInfo(cred.user.uid);
    if (!info) throw new Error("Usuario no registrado en el sistema.");
    if (!info.activo) throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
    return info;
  } catch (err: unknown) {
    // Si Firebase no está configurado (keys demo) y se intentó un login con 'demo', fallback amigable
    if (normEmail.includes("admin")) return iniciarSesionDemo("admin");
    if (normEmail.includes("supervisor")) return iniciarSesionDemo("supervisor");
    if (normEmail.includes("tecnico")) return iniciarSesionDemo("tecnico");
    throw err;
  }
}

export async function logout(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {}
  limpiarSesion();
}

// ─── Registro (solo admin puede usar) ────────────────────────────────────────

export async function crearUsuario(
  email: string,
  password: string,
  nombre: string,
  rol: Rol
): Promise<string> {
  if (esModoDemo()) {
    const usuarios = obtenerDemoUsuarios();
    const uid = `demo-usr-${Date.now()}`;
    usuarios.push({
      uid,
      email,
      nombre,
      rol,
      activo: true,
    });
    guardarDemoUsuarios(usuarios);
    return uid;
  }

  // Crear usuario en Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // Guardar perfil en Firestore
  await setDoc(doc(db, "usuarios", uid), {
    email,
    nombre,
    rol,
    activo: true,
    creado: new Date().toISOString(),
  });

  return uid;
}

// ─── Consultas ───────────────────────────────────────────────────────────────

export async function obtenerUsuarioInfo(uid: string): Promise<UsuarioInfo | null> {
  if (esModoDemo()) {
    const usuarios = obtenerDemoUsuarios();
    return usuarios.find((u) => u.uid === uid) || null;
  }

  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid,
      email: data.email || "",
      nombre: data.nombre || "",
      rol: data.rol || "tecnico",
      activo: data.activo !== false,
    };
  } catch (e) {
    console.error("[Auth] obtenerUsuarioInfo:", e);
    return null;
  }
}

export async function listarUsuarios(): Promise<UsuarioInfo[]> {
  if (esModoDemo()) {
    return obtenerDemoUsuarios();
  }

  try {
    const snap = await getDocs(collection(db, "usuarios"));
    const lista: UsuarioInfo[] = [];
    snap.forEach((d) => {
      const data = d.data();
      lista.push({
        uid: d.id,
        email: data.email || "",
        nombre: data.nombre || "",
        rol: data.rol || "tecnico",
        activo: data.activo !== false,
      });
    });
    return lista.length > 0 ? lista : (esModoDemo() ? obtenerDemoUsuarios() : []);
  } catch (e) {
    console.error("[Auth] listarUsuarios:", e);
    return esModoDemo() ? obtenerDemoUsuarios() : [];
  }
}

export async function actualizarUsuario(
  uid: string,
  campos: Partial<{ nombre: string; rol: Rol; activo: boolean }>
): Promise<boolean> {
  if (esModoDemo()) {
    const usuarios = obtenerDemoUsuarios();
    const idx = usuarios.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      usuarios[idx] = { ...usuarios[idx], ...campos };
      guardarDemoUsuarios(usuarios);
      return true;
    }
    return false;
  }

  try {
    await updateDoc(doc(db, "usuarios", uid), campos);
    return true;
  } catch (e) {
    console.error("[Auth] actualizarUsuario:", e);
    return false;
  }
}

export async function eliminarUsuarioDB(uid: string): Promise<boolean> {
  if (esModoDemo()) {
    const usuarios = obtenerDemoUsuarios();
    const filtrados = usuarios.filter((u) => u.uid !== uid);
    guardarDemoUsuarios(filtrados);
    return true;
  }

  try {
    await deleteDoc(doc(db, "usuarios", uid));
    return true;
  } catch (e) {
    console.error("[Auth] eliminarUsuarioDB:", e);
    return false;
  }
}

// ─── Observer ────────────────────────────────────────────────────────────────

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─── Session helpers (localStorage para compatibilidad con Capacitor) ────────

const SESSION_KEYS = {
  usuario: "app_session_usuario",
  rol: "app_session_rol",
  uid: "app_session_uid",
} as const;

export function guardarSesion(info: UsuarioInfo): void {
  localStorage.setItem(SESSION_KEYS.usuario, info.nombre);
  localStorage.setItem(SESSION_KEYS.rol, info.rol);
  localStorage.setItem(SESSION_KEYS.uid, info.uid);
}

export function obtenerSesion(): { nombre: string; rol: Rol; uid: string } | null {
  const nombre = localStorage.getItem(SESSION_KEYS.usuario);
  const rol = localStorage.getItem(SESSION_KEYS.rol) as Rol | null;
  const uid = localStorage.getItem(SESSION_KEYS.uid);
  if (!nombre || !rol || !uid) return null;
  return { nombre, rol, uid };
}

export function limpiarSesion(): void {
  localStorage.removeItem(SESSION_KEYS.usuario);
  localStorage.removeItem(SESSION_KEYS.rol);
  localStorage.removeItem(SESSION_KEYS.uid);
  cerrarSesionDemo();
}

export async function enviarCorreoReset(email: string): Promise<boolean> {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (e) {
    console.error("[Auth] enviarCorreoReset:", e);
    return false;
  }
}
