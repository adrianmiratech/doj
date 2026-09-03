import PDFDocument from "pdfkit";

export function generarCertificadoAntecedentesPdf(datos: {
  nombreCiudadano: string;
  tieneAntecedentes: boolean;
  detalle: string | null;
  firmante: string;
  rangoFirmante: string;
  fecha: Date;
  numeroReferencia: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const dorado = "#c9a227";
    const negro = "#111111";
    const gris = "#555555";
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 56;

    // Marco decorativo exterior e interior, repetido en cada página: si el
    // detalle es largo y desborda a una página nueva (PDFKit las añade
    // sola), sin este listener solo la primera página tenía el estilo.
    const dibujarMarco = () => {
      doc.rect(24, 24, pageW - 48, pageH - 48).lineWidth(2).strokeColor(dorado).stroke();
      doc.rect(30, 30, pageW - 60, pageH - 60).lineWidth(0.75).strokeColor(dorado).stroke();
    };
    doc.on("pageAdded", dibujarMarco);
    dibujarMarco();

    const fechaStr = datos.fecha.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

    // Cabecera.
    doc
      .fillColor(negro)
      .fontSize(19)
      .font("Helvetica-Bold")
      .text("DEPARTAMENTO DE JUSTICIA", margin, 60, { align: "center", width: pageW - margin * 2, characterSpacing: 1.5 })
      .fontSize(10)
      .font("Helvetica")
      .fillColor(gris)
      .text("OLD STATE RP", { align: "center", width: pageW - margin * 2, characterSpacing: 3 });

    doc
      .moveTo(pageW / 2 - 70, 100)
      .lineTo(pageW / 2 + 70, 100)
      .lineWidth(1)
      .strokeColor(dorado)
      .stroke();

    doc
      .fillColor(negro)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("CERTIFICADO DE ANTECEDENTES PENALES", margin, 125, { align: "center", width: pageW - margin * 2 });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(gris)
      .text(`Nº de referencia: ${datos.numeroReferencia}`, margin, 155, { align: "center", width: pageW - margin * 2 });

    // Cuerpo.
    let y = 200;
    doc.fillColor(negro).fontSize(11).font("Helvetica");
    doc.text(`Expedido en Los Santos a ${fechaStr}.`, margin, y, { width: pageW - margin * 2 });
    y = doc.y + 18;

    if (datos.tieneAntecedentes) {
      doc.text(
        `Por la presente se hace constar que, según los registros oficiales del Departamento de Justicia, ${datos.nombreCiudadano} SÍ CONSTA con antecedentes penales a fecha de hoy.`,
        margin,
        y,
        { align: "justify", width: pageW - margin * 2 },
      );
      if (datos.detalle) {
        y = doc.y + 16;
        doc.font("Helvetica-Bold").text("Detalle:", margin, y, { width: pageW - margin * 2 });
        y = doc.y + 4;
        // Ver documento-oficial-pdf.ts: hay que quitar el \r que los
        // navegadores añaden a los saltos de línea de un <textarea>, o PDFKit
        // termina renderizando una "Ð" suelta al final de cada línea.
        const detalle = datos.detalle.replace(/\r\n?/g, "\n");
        doc.font("Helvetica").text(detalle, margin, y, { align: "justify", width: pageW - margin * 2 });
      }
    } else {
      doc.text(
        `Por la presente se hace constar que, según los registros oficiales del Departamento de Justicia, ${datos.nombreCiudadano} NO CONSTA con ningún tipo de antecedente penal a fecha de hoy.`,
        margin,
        y,
        { align: "justify", width: pageW - margin * 2 },
      );
    }

    // Sello (marcador circular decorativo) y firma, anclados hacia el final de la
    // página para certificados cortos; si el detalle desbordó el texto hasta ahí
    // (o a una página nueva), se coloca después del texto en vez de encima.
    const ALTO_BLOQUE_FIRMA = 140;
    let firmaY = Math.max(doc.y + 40, pageH - 190);
    if (firmaY + ALTO_BLOQUE_FIRMA > pageH - 40) {
      doc.addPage();
      firmaY = pageH - 190;
    }

    doc.save();
    doc.circle(margin + 45, firmaY + 10, 42).lineWidth(1.5).strokeColor(dorado).stroke();
    doc.circle(margin + 45, firmaY + 10, 36).lineWidth(0.5).strokeColor(dorado).stroke();
    doc
      .fontSize(7)
      .fillColor(dorado)
      .font("Helvetica-Bold")
      .text("DEPARTAMENTO", margin + 5, firmaY - 6, { width: 80, align: "center", characterSpacing: 0.5 })
      .text("DE JUSTICIA", margin + 5, firmaY + 2, { width: 80, align: "center", characterSpacing: 0.5 })
      .fontSize(6)
      .font("Helvetica")
      .text("OLD STATE RP", margin + 5, firmaY + 22, { width: 80, align: "center" });
    doc.restore();

    doc
      .fontSize(10)
      .fillColor(negro)
      .font("Helvetica-Bold")
      .text(`${datos.rangoFirmante} ${datos.firmante}`, pageW - margin - 220, firmaY + 4, { width: 220, align: "right" })
      .font("Helvetica")
      .fontSize(8)
      .fillColor(gris)
      .text("Firma autorizada del Departamento de Justicia", pageW - margin - 220, doc.y + 2, {
        width: 220,
        align: "right",
      });
    doc
      .moveTo(pageW - margin - 220, firmaY)
      .lineTo(pageW - margin, firmaY)
      .lineWidth(0.75)
      .strokeColor(gris)
      .stroke();

    doc
      .fontSize(7.5)
      .fillColor(gris)
      .font("Helvetica-Oblique")
      .text(
        "Documento generado automáticamente por el portal del Departamento de Justicia. Su validez está sujeta a verificación por el propio Departamento.",
        margin,
        pageH - 60,
        { align: "center", width: pageW - margin * 2 },
      );

    doc.end();
  });
}
