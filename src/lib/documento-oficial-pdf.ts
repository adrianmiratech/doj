import PDFDocument from "pdfkit";

/** Genera un documento oficial genérico del DOJ (membrete + sello + firma), a partir de un título y un texto libre. */
export function generarDocumentoOficialPdf(datos: {
  titulo: string;
  contenido: string;
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

    // El marco decorativo debe repetirse en cada página: un contenido largo
    // desborda automáticamente a páginas nuevas (PDFKit las añade solo), y sin
    // este listener solo la primera página quedaba con el estilo del membrete.
    const dibujarMarco = () => {
      doc.rect(24, 24, pageW - 48, pageH - 48).lineWidth(2).strokeColor(dorado).stroke();
      doc.rect(30, 30, pageW - 60, pageH - 60).lineWidth(0.75).strokeColor(dorado).stroke();
    };
    doc.on("pageAdded", dibujarMarco);
    dibujarMarco();

    const fechaStr = datos.fecha.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

    doc
      .fillColor(negro)
      .fontSize(19)
      .font("Helvetica-Bold")
      .text("DEPARTAMENTO DE JUSTICIA", margin, 60, { align: "center", width: pageW - margin * 2, characterSpacing: 1.5 })
      .fontSize(10)
      .font("Helvetica")
      .fillColor(gris)
      .text("ESTADO DE SAN ANDREAS · OLD STATE RP", { align: "center", width: pageW - margin * 2, characterSpacing: 2 });

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
      .text(datos.titulo.toUpperCase(), margin, 125, { align: "center", width: pageW - margin * 2 });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(gris)
      .text(`Nº de referencia: ${datos.numeroReferencia}`, margin, doc.y + 6, { align: "center", width: pageW - margin * 2 });

    let y = 200;
    doc.fillColor(negro).fontSize(11).font("Helvetica");
    doc.text(`Expedido en el Estado de San Andreas a ${fechaStr}.`, margin, y, { width: pageW - margin * 2 });
    y = doc.y + 18;
    // Los navegadores normalizan los saltos de línea de un <textarea> a \r\n al
    // enviar el formulario. PDFKit corta la línea en el \n pero deja el \r
    // pegado al final del texto anterior; al codificarlo como fuente estándar
    // ese \r produce un dígito hexadecimal suelto que desplaza la cadena hex y
    // termina renderizando "Ð" al final de cada línea. Se normaliza antes de
    // pasarlo a PDFKit para evitarlo.
    const contenido = datos.contenido.replace(/\r\n?/g, "\n");
    doc.text(contenido, margin, y, { align: "justify", width: pageW - margin * 2 });

    // La firma/sello se ancla cerca del final de la página para documentos
    // cortos, pero si el contenido llega hasta ahí (o se desbordó a una
    // página nueva) hay que colocarla después del texto, nunca encima.
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
      .text("SAN ANDREAS", margin + 5, firmaY + 22, { width: 80, align: "center" });
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
        "Documento generado automáticamente por el portal del Departamento de Justicia. Su validez está sujeta a verificación por el propio Departamento. Contenido ficticio para un servidor de rol.",
        margin,
        pageH - 60,
        { align: "center", width: pageW - margin * 2 },
      );

    doc.end();
  });
}
