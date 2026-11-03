/**
 * lib/report-engine.ts — Motor de procesamiento de informes.
 * Traducción directa de core/report_engine.py
 */

// ─── Helpers de Formato ──────────────────────────────────────────────────────

const NUM_LETRAS: Record<number, string> = {
  1: "Un", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco",
  6: "Seis", 7: "Siete", 8: "Ocho", 9: "Nueve", 10: "Diez",
  11: "Once", 12: "Doce", 13: "Trece", 14: "Catorce", 15: "Quince",
  16: "Dieciséis", 17: "Diecisiete", 18: "Dieciocho",
  19: "Diecinueve", 20: "Veinte",
};

export function numeroALetras(n: number): string {
  return NUM_LETRAS[n] || String(n);
}

export function formatearMaterial(cant: number, nomMat: string, unidad: string): string {
  if (unidad === "MTRS") return `${cant} mts de ${nomMat}`;
  if (unidad === "ROLLO") return `${cant} rollo(s) de ${nomMat}`;
  return `${cant} ${nomMat}`;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Registro {
  ubicacion: string;
  id_dispositivo?: string | null;
  nombre_custom?: string;
  observacion?: string;
  id_material: string;
  cantidad: string | number;
}

export interface MaterialInfo {
  nombre: string;
  unidad: string;
}

export interface DispositivoInfo {
  nombre: string;
  materiales_vinculados?: string[];
}

// ─── Motor de Suma por Categoría ─────────────────────────────────────────────

export function procesarDatosCategoria(
  registros: Registro[],
  materiales: Record<string, MaterialInfo>,
  dispositivos: Record<string, DispositivoInfo>
): {
  equipos: Record<string, number>;
  materialesSum: Record<string, { nombre: string; unidad: string; cantidad: number }>;
} {
  const equipos: Record<string, number> = {};
  const materialesSum: Record<string, { nombre: string; unidad: string; cantidad: number }> = {};

  const nombresDispositivos = new Set(
    Object.values(dispositivos)
      .filter((d) => d && typeof d === "object" && d.nombre)
      .map((d) => d.nombre.toLowerCase().trim())
  );

  for (const reg of registros) {
    const idMat = reg.id_material;
    let nomMat = "material sin identificar";
    let undMat = "UND";

    if (idMat && materiales[String(idMat)]) {
      nomMat = materiales[String(idMat)].nombre.trim();
      undMat = materiales[String(idMat)].unidad.trim().toUpperCase();
    }

    const cant = parseInt(String(reg.cantidad || 0), 10);
    if (cant <= 0) continue;

    const idDisp = reg.id_dispositivo;
    let nomDisp = "";
    if (idDisp && dispositivos[String(idDisp)]) {
      nomDisp = dispositivos[String(idDisp)].nombre.trim();
    } else if (reg.nombre_custom) {
      nomDisp = reg.nombre_custom.trim();
    }

    const esDispositivo =
      nombresDispositivos.has(nomMat.toLowerCase()) ||
      (nomDisp && nomMat.toLowerCase() === nomDisp.toLowerCase());

    if (esDispositivo) {
      equipos[nomMat] = (equipos[nomMat] || 0) + cant;
    } else {
      const key = `${nomMat.toLowerCase()}|${undMat}`;
      if (!materialesSum[key]) {
        materialesSum[key] = { nombre: nomMat, unidad: undMat, cantidad: 0 };
      }
      materialesSum[key].cantidad += cant;
    }
  }

  return { equipos, materialesSum };
}

// ─── Generadores de Texto ────────────────────────────────────────────────────

export function generarTextoSolicitudConsumo(
  paquete: { datos?: Record<string, Registro[]> },
  materiales: Record<string, MaterialInfo>,
  dispositivos: Record<string, DispositivoInfo>
): string {
  const totalEquipos: Record<string, number> = {};
  const totalMateriales: Record<string, { nombre: string; unidad: string; cantidad: number }> = {};

  for (const registros of Object.values(paquete.datos || {})) {
    const { equipos, materialesSum } = procesarDatosCategoria(
      registros,
      materiales,
      dispositivos
    );
    for (const [k, v] of Object.entries(equipos)) {
      totalEquipos[k] = (totalEquipos[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(materialesSum)) {
      if (!totalMateriales[k]) {
        totalMateriales[k] = { ...v };
      } else {
        totalMateriales[k].cantidad += v.cantidad;
      }
    }
  }

  const lineas: string[] = ["SOLICITUD DE CONSUMO GENERAL", "=".repeat(36), ""];

  lineas.push("1. EQUIPOS REQUERIDOS:");
  if (Object.keys(totalEquipos).length === 0) {
    lineas.push("   (Ninguno)");
  } else {
    for (const [eq, cant] of Object.entries(totalEquipos)) {
      lineas.push(`   - ${String(cant).padStart(2, "0")} ${eq.charAt(0).toUpperCase() + eq.slice(1)}`);
    }
  }

  lineas.push("");
  lineas.push("2. MATERIALES REQUERIDOS:");
  if (Object.keys(totalMateriales).length === 0) {
    lineas.push("   (Ninguno)");
  } else {
    for (const mat of Object.values(totalMateriales)) {
      if (mat.cantidad > 0) {
        lineas.push(`   - ${formatearMaterial(mat.cantidad, mat.nombre, mat.unidad)}`);
      }
    }
  }

  return lineas.join("\n");
}

export function generarTextoResumenInforme(
  paquete: { datos?: Record<string, Registro[]> },
  materiales: Record<string, MaterialInfo>,
  dispositivos: Record<string, DispositivoInfo>
): string {
  const datos = paquete.datos || {};

  const { equipos: eqCorr, materialesSum: matCorr } = procesarDatosCategoria(
    datos["Correctivo"] || [],
    materiales,
    dispositivos
  );
  const { equipos: eqNuev, materialesSum: matNuev } = procesarDatosCategoria(
    datos["Instalaciones Nuevas"] || [],
    materiales,
    dispositivos
  );
  const { materialesSum: matCab } = procesarDatosCategoria(
    datos["Recableados"] || [],
    materiales,
    dispositivos
  );

  const lineas: string[] = [];

  // Sección 1
  lineas.push("1. Suministro y cambio del siguiente equipo:\n");
  if (Object.keys(eqCorr).length === 0) {
    lineas.push("(Ninguno)");
  } else {
    for (const [eq, cant] of Object.entries(eqCorr)) {
      const letras = numeroALetras(cant);
      lineas.push(
        `${letras.charAt(0).toUpperCase() + letras.slice(1)} (${String(cant).padStart(2, "0")}) ${eq.toLowerCase()}`
      );
    }
  }

  lineas.push(
    "\nPara este fin se requiere contar con los siguientes materiales:\n"
  );
  if (Object.keys(matCorr).length === 0) {
    lineas.push("(Ninguno)");
  } else {
    for (const mat of Object.values(matCorr)) {
      if (mat.cantidad > 0) {
        lineas.push(formatearMaterial(mat.cantidad, mat.nombre, mat.unidad));
      }
    }
  }

  // Sección 2
  lineas.push(
    "\n\n2. Suministro e instalación de los siguientes equipos:\n"
  );
  if (Object.keys(eqNuev).length === 0) {
    lineas.push("(Ninguno)");
  } else {
    for (const [eq, cant] of Object.entries(eqNuev)) {
      const letras = numeroALetras(cant);
      lineas.push(
        `·       ${letras.charAt(0).toUpperCase() + letras.slice(1)} (${String(cant).padStart(2, "0")}) ${eq.toLowerCase()}`
      );
    }
  }

  lineas.push(
    "\nPara esto se requiere contar con los siguientes materiales:\n"
  );
  if (Object.keys(matNuev).length === 0) {
    lineas.push("(Ninguno)");
  } else {
    for (const mat of Object.values(matNuev)) {
      if (mat.cantidad > 0) {
        lineas.push(formatearMaterial(mat.cantidad, mat.nombre, mat.unidad));
      }
    }
  }

  // Sección 3
  lineas.push(
    "\n\n3. Independización y recableado de los dispositivos de alarma " +
      "que incluye el cambio del cableado de los dispositivos a cable FPLR u otros:\n"
  );
  if (Object.keys(matCab).length === 0) {
    lineas.push("(Ninguno)");
  } else {
    for (const mat of Object.values(matCab)) {
      if (mat.cantidad > 0) {
        lineas.push(formatearMaterial(mat.cantidad, mat.nombre, mat.unidad));
      }
    }
  }

  return lineas.join("\n");
}
