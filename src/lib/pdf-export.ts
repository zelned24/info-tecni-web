import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CATEGORIAS } from "./config";
import type { DocumentData } from "firebase/firestore";

export async function exportarPDFInforme(
  informe: DocumentData,
  materiales: Record<string, { nombre: string; unidad: string }>,
  dispositivos: Record<string, { nombre: string }>
) {
  const doc = new jsPDF("p", "pt", "a4");
  const meta = informe.metadatos || {};
  const datos = informe.datos || {};
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INFORME DE MANTENIMIENTO", 40, 40);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Agencia: ${meta.agencia || "-"}`, 40, 60);
  doc.text(`Técnico: ${meta.tecnico || "-"}`, 40, 75);
  doc.text(`Fecha: ${meta.fecha || "-"}`, 40, 90);
  doc.text(`Estado: ${informe.estado || "Borrador/Pendiente"}`, 40, 105);
  
  if (informe.supervisor) {
    doc.text(`Supervisor: ${informe.supervisor}`, 300, 60);
  }
  if (informe.tecnicos_asignados && informe.tecnicos_asignados.length > 0) {
    doc.text(`Equipo: ${informe.tecnicos_asignados.join(", ")}`, 300, 75);
  }

  let finalY = 125;

  for (const cat of CATEGORIAS) {
    const regs = datos[cat] || [];
    if (!Array.isArray(regs) || regs.length === 0) continue;

    // Categoría Header
    if (finalY > 750) {
      doc.addPage();
      finalY = 40;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(cat.toUpperCase(), 40, finalY + 10);
    finalY += 20;

    const mappedRegs = regs.map(r => {
      const ubi = String(r.ubicacion || "").toUpperCase();
      let disp = "-- Mat. Suelto --";
      if (r.id_dispositivo) {
        disp = (dispositivos[String(r.id_dispositivo)] as any)?.nombre || r.nombre_custom || disp;
      } else if (r.nombre_custom) {
        disp = r.nombre_custom;
      }
      const mat = (materiales[String(r.id_material)] as any)?.nombre || "N/R";
      const cant = `${r.cantidad || 0} ${(materiales[String(r.id_material)] as any)?.unidad || "-"}`;
      const obs = String(r.observacion || "").trim();
      return { ubi, disp, mat, cant, obs };
    });

    // Ordenar por ubicación -> dispositivo -> observación
    mappedRegs.sort((a, b) => {
      const c1 = a.ubi.localeCompare(b.ubi);
      if (c1 !== 0) return c1;
      const c2 = a.disp.localeCompare(b.disp);
      if (c2 !== 0) return c2;
      return a.obs.localeCompare(b.obs);
    });

    const tableBody: any[] = [];
    let i = 0;
    while (i < mappedRegs.length) {
      let spanUbi = 1;
      for (let j = i + 1; j < mappedRegs.length; j++) {
        if (mappedRegs[j].ubi === mappedRegs[i].ubi) spanUbi++;
        else break;
      }

      let j = i;
      while (j < i + spanUbi) {
        let spanDisp = 1;
        for (let k = j + 1; k < i + spanUbi; k++) {
          if (mappedRegs[k].disp === mappedRegs[j].disp) spanDisp++;
          else break;
        }

        let k = j;
        while (k < j + spanDisp) {
          let spanObs = 1;
          for (let m = k + 1; m < j + spanDisp; m++) {
            if (mappedRegs[m].obs === mappedRegs[k].obs) spanObs++;
            else break;
          }

          for (let m = k; m < k + spanObs; m++) {
            const row = [];
            const r = mappedRegs[m];

            if (m === i) {
              row.push({ content: r.ubi, rowSpan: spanUbi, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
            }
            if (m === j) {
              row.push({ content: r.disp, rowSpan: spanDisp, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
            }

            row.push(r.mat, { content: r.cant, styles: { halign: 'center' } });

            if (m === k) {
              row.push({ content: r.obs, rowSpan: spanObs, styles: { valign: 'middle' } });
            }

            tableBody.push(row);
          }
          k += spanObs;
        }
        j += spanDisp;
      }
      i += spanUbi;
    }

    autoTable(doc, {
      startY: finalY,
      head: [["Ubicación", "Equipo Revisado", "Material Utilizado", "Cant", "Observación"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [46, 117, 182] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 100 },
        2: { cellWidth: 140 },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 135 }
      },
    });

    finalY = (doc as any).lastAutoTable.finalY + 20;
  }

  const safeAgencia = String(meta.agencia || "SIN_AGENCIA").replace(/[^a-zA-Z0-9_\-]/g, "_").trim();
  const safeFecha = String(meta.fecha || "FECHA").replace(/[^a-zA-Z0-9_\-]/g, "_").trim();
  const fileName = `Informe_${safeAgencia}_${safeFecha}.pdf`;
  
  // Limpieza adicional del nombre por si acaso hay saltos de línea ocultos
  const finalFileName = fileName.replace(/[\r\n]+/g, "");

  // Web Puro (Descarga mediante doc.save)
  doc.save(finalFileName);
}
