import { CATEGORIAS } from "./config";
import type { DocumentData } from "firebase/firestore";

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

export function sanitizarNombreArchivo(str: string): string {
  return String(str || "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generarExcelInformeBuffer(
  pq: DocumentData,
  materiales: Record<string, DocumentData>,
  dispositivos: Record<string, DocumentData>,
  ExcelJSModule?: any
): Promise<{ buffer: ArrayBuffer; defaultFilename: string }> {
  const ExcelJS = ExcelJSModule || (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const meta = pq.metadatos || {};
  const datos = pq.datos || {};

  const headerStyle: any = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } },
    alignment: { vertical: "middle", horizontal: "center" },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
  };

  const subHeaderStyle: any = {
    font: { bold: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
  };

  for (const cat of CATEGORIAS) {
    const regs = datos[cat] || [];
    if (!Array.isArray(regs) || regs.length === 0) continue;

    const worksheet = workbook.addWorksheet(cat.substring(0, 31));
    worksheet.columns = [
      { header: "Ubicación / Ambiente", key: "ubi", width: 25 },
      { header: "Equipo Revisado", key: "disp", width: 30 },
      { header: "Observación", key: "obs", width: 40 },
      { header: "Material Utilizado", key: "mat", width: 40 },
      { header: "Cantidad", key: "cant", width: 12 },
      { header: "Unidad", key: "und", width: 10 }
    ];

    worksheet.insertRow(1, [`INFORME ${cat.toUpperCase()} - AGENCIA: ${meta.agencia || ""} - TÉCNICO: ${meta.tecnico || ""} - FECHA: ${meta.fecha || ""}`]);
    worksheet.mergeCells(1, 1, 1, 6);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.style = headerStyle;
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };

    const sortedRegs = [...regs].sort((a: DocumentData, b: DocumentData) => {
      const ua = String(a.ubicacion || "").toUpperCase();
      const ub = String(b.ubicacion || "").toUpperCase();
      if (ua !== ub) return ua.localeCompare(ub);
      const da = a.id_dispositivo ? ((dispositivos[String(a.id_dispositivo)] as DocumentData)?.nombre || a.nombre_custom || "") : (a.nombre_custom || "");
      const db2 = b.id_dispositivo ? ((dispositivos[String(b.id_dispositivo)] as DocumentData)?.nombre || b.nombre_custom || "") : (b.nombre_custom || "");
      return da.localeCompare(db2);
    });

    const headerRow = worksheet.getRow(2);
    headerRow.values = ["Ubicación / Ambiente", "Equipo Revisado", "Observación", "Material Utilizado", "Cantidad", "Unidad"];
    headerRow.eachCell((cell: any) => { cell.style = subHeaderStyle; });

    let currentRow = 3;
    for (const r of sortedRegs) {
      const nd = r.id_dispositivo
        ? ((dispositivos[String(r.id_dispositivo)] as DocumentData)?.nombre || r.nombre_custom || "Mat. Suelto")
        : (r.nombre_custom || "-- Mat. Suelto --");

      const row = worksheet.addRow([
        String(r.ubicacion || "").toUpperCase(), nd,
        String(r.observacion || "").trim(),
        (materiales[String(r.id_material)] as DocumentData)?.nombre || "N/R",
        r.cantidad,
        (materiales[String(r.id_material)] as DocumentData)?.unidad || "-"
      ]);
      row.eachCell((cell: any) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.alignment = { vertical: "middle", wrapText: true };
      });
      currentRow++;
    }

    // Merge Ubicaciones
    let startUbi = 3;
    while (startUbi < currentRow) {
      let endUbi = startUbi + 1;
      const ubiVal = worksheet.getCell(startUbi, 1).value;
      while (endUbi < currentRow && worksheet.getCell(endUbi, 1).value === ubiVal) endUbi++;
      if (endUbi - startUbi > 1) worksheet.mergeCells(startUbi, 1, endUbi - 1, 1);
      let startDisp = startUbi;
      while (startDisp < endUbi) {
        let endDisp = startDisp + 1;
        const dispVal = worksheet.getCell(startDisp, 2).value;
        while (endDisp < endUbi && worksheet.getCell(endDisp, 2).value === dispVal) endDisp++;
        if (endDisp - startDisp > 1) worksheet.mergeCells(startDisp, 2, endDisp - 1, 2);
        let startObs = startDisp;
        while (startObs < endDisp) {
          let endObs = startObs + 1;
          const obsVal = worksheet.getCell(startObs, 3).value;
          while (endObs < endDisp && worksheet.getCell(endObs, 3).value === obsVal) endObs++;
          if (endObs - startObs > 1) worksheet.mergeCells(startObs, 3, endObs - 1, 3);
          startObs = endObs;
        }
        startDisp = endDisp;
      }
      startUbi = endUbi;
    }
  }

  // RESUMEN sheet
  const resSheet = workbook.addWorksheet("RESUMEN");
  resSheet.columns = [{ width: 50 }, { width: 15 }, { width: 15 }];
  resSheet.addRow([`RESUMEN GENERAL - ${meta.agencia || ""} - TÉCNICO: ${meta.tecnico || ""} - FECHA: ${meta.fecha || ""}`]);
  resSheet.mergeCells(1, 1, 1, 3);
  resSheet.getCell(1, 1).style = headerStyle;

  let resRow = 3;
  for (const cat of CATEGORIAS) {
    const regs = datos[cat] || [];
    if (!Array.isArray(regs) || regs.length === 0) continue;
    const label = cat === "Recableados" ? "RECABLEADO GENERAL" : cat.toUpperCase();
    const catRow = resSheet.addRow([label]);
    resSheet.mergeCells(resRow, 1, resRow, 3);
    catRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBDD7EE" } };
    catRow.getCell(1).font = { bold: true };
    resRow++;
    const head = resSheet.addRow(["Elemento", "Cantidad", "Unidad"]);
    head.eachCell((c: any) => (c.style = subHeaderStyle));
    resRow++;
    const sums: Record<string, { nombre: string; unidad: string; cantidad: number }> = {};
    for (const r of regs) {
      const nm = (materiales[String(r.id_material)] as DocumentData)?.nombre || "Sin nombre";
      const und = (materiales[String(r.id_material)] as DocumentData)?.unidad || "UND";
      const key = `${nm}|${und}`;
      if (!sums[key]) sums[key] = { nombre: nm, unidad: und, cantidad: 0 };
      sums[key].cantidad += parseInt(String(r.cantidad || 0));
    }
    for (const s of Object.values(sums)) {
      if (s.cantidad > 0) {
        const r = resSheet.addRow([s.nombre, s.cantidad, s.unidad]);
        r.eachCell((c: any) => (c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }));
        resRow++;
      }
    }
    resSheet.addRow([]);
    resRow++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const defaultFilename = `Informe_${sanitizarNombreArchivo(meta.agencia || "SIN")}_${sanitizarNombreArchivo(meta.fecha || "FECHA")}.xlsx`;
  return { buffer, defaultFilename };
}

export function descargarBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export async function exportarExcelIndividual(
  pq: DocumentData,
  materiales: Record<string, DocumentData>,
  dispositivos: Record<string, DocumentData>
) {
  const { buffer, defaultFilename } = await generarExcelInformeBuffer(pq, materiales, dispositivos);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  descargarBlob(blob, defaultFilename);
}

export async function exportarTodosExcelZip(
  items: Array<[string, DocumentData]>,
  materiales: Record<string, DocumentData>,
  dispositivos: Record<string, DocumentData>,
  onProgress?: ProgressCallback,
  checkCancelled?: () => boolean
): Promise<{ totalExportados: number }> {
  if (items.length === 0) return { totalExportados: 0 };

  const ExcelJS = (await import("exceljs")).default;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const nombresUsados = new Set<string>();
  const total = items.length;

  for (let i = 0; i < total; i++) {
    if (checkCancelled && checkCancelled()) {
      throw new Error("Descarga cancelada por el usuario");
    }

    const [, pq] = items[i];
    const meta = pq.metadatos || {};
    const agencia = meta.agencia || "SinAgencia";

    onProgress?.(i + 1, total, `Generando (${i + 1}/${total}): ${agencia}`);

    const { buffer } = await generarExcelInformeBuffer(pq, materiales, dispositivos, ExcelJS);

    // Evitar colisiones de nombre dentro del archivo ZIP
    const agLimpia = sanitizarNombreArchivo(meta.agencia || "SIN");
    const fecLimpia = sanitizarNombreArchivo(meta.fecha || "FECHA");
    const baseFilename = `Informe_${agLimpia}_${fecLimpia}`;
    let finalFilename = `${baseFilename}.xlsx`;
    let counter = 1;
    while (nombresUsados.has(finalFilename)) {
      counter++;
      finalFilename = `${baseFilename}_(${counter}).xlsx`;
    }
    nombresUsados.add(finalFilename);

    zip.file(finalFilename, buffer);

    // Ceder el hilo de ejecución para que la UI se renderice fluidamente
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (checkCancelled && checkCancelled()) {
    throw new Error("Descarga cancelada por el usuario");
  }

  onProgress?.(total, total, "Comprimiendo archivo ZIP...");
  await new Promise((resolve) => setTimeout(resolve, 40));

  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.(total, total, `Comprimiendo ZIP: ${Math.round(metadata.percent)}%`);
    }
  );

  const fechaHoy = new Date().toISOString().slice(0, 10);
  descargarBlob(zipBlob, `Informes_Excels_${fechaHoy}.zip`);

  return { totalExportados: total };
}

