import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Cotizacion, Factura } from '../api';

const companyInfo = {
  name: "Datrah Systems SpA",
  rut: "76.543.210-9",
  address: "Av. Providencia 1234, Oficina 506",
  city: "Santiago, Chile",
  phone: "+56 9 1234 5678",
  email: "contacto@datrah.cl"
};

export const generarCotizacionPDF = (cotizacion: Cotizacion) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("COTIZACIÓN", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`N° ${cotizacion.numeroCotizacion}`, 105, 26, { align: "center" });

  // Company Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(companyInfo.name, 14, 40);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`RUT: ${companyInfo.rut}`, 14, 45);
  doc.text(companyInfo.address, 14, 50);
  doc.text(companyInfo.city, 14, 55);
  doc.text(`Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, 14, 60);

  // Client Info
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Emitido a:", 120, 40);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (cotizacion.cliente) {
    doc.text(`${cotizacion.cliente.nombre}`, 120, 45);
    doc.text(`RUT: ${cotizacion.cliente.documentoIdentidad}`, 120, 50);
    doc.text(`${cotizacion.cliente.email || ''}`, 120, 55);
  } else {
    doc.text("Cliente General", 120, 45);
  }

  // Dates
  const fecha = new Date(cotizacion.fechaEmision).toLocaleDateString();
  const fechaVencimiento = new Date(new Date(cotizacion.fechaEmision).getTime() + (cotizacion.validezDias * 24 * 60 * 60 * 1000)).toLocaleDateString();
  
  doc.text(`Fecha Emisión: ${fecha}`, 14, 75);
  doc.text(`Válida hasta: ${fechaVencimiento}`, 120, 75);

  // Table
  const tableData = cotizacion.detalles.map(d => [
    d.producto.nombre,
    Number(d.cantidad).toFixed(2),
    `$${Number(d.precioUnitario).toLocaleString()}`,
    `$${Number(d.descuento).toLocaleString()}`,
    `$${Number(d.subtotal).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['Producto', 'Cantidad', 'Precio Unit.', 'Descuento', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subtotal:`, 140, finalY);
  doc.text(`$${Number(cotizacion.subtotal).toLocaleString()}`, 190, finalY, { align: "right" });
  
  if (cotizacion.descuentoGlobal && Number(cotizacion.descuentoGlobal) > 0) {
    doc.text(`Descuento Global:`, 140, finalY + 7);
    doc.text(`-$${Number(cotizacion.descuentoGlobal).toLocaleString()}`, 190, finalY + 7, { align: "right" });
    doc.text(`IVA (${cotizacion.impuestoPorcentaje}%):`, 140, finalY + 14);
    doc.text(`$${Number(cotizacion.impuestoValor).toLocaleString()}`, 190, finalY + 14, { align: "right" });
    doc.setFontSize(12);
    doc.text(`Total:`, 140, finalY + 22);
    doc.text(`$${Number(cotizacion.total).toLocaleString()}`, 190, finalY + 22, { align: "right" });
  } else {
    doc.text(`IVA (${cotizacion.impuestoPorcentaje}%):`, 140, finalY + 7);
    doc.text(`$${Number(cotizacion.impuestoValor).toLocaleString()}`, 190, finalY + 7, { align: "right" });
    doc.setFontSize(12);
    doc.text(`Total:`, 140, finalY + 15);
    doc.text(`$${Number(cotizacion.total).toLocaleString()}`, 190, finalY + 15, { align: "right" });
  }

  // Notes
  if (cotizacion.notas) {
    const finalYNotes = finalY + 30;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("Notas:", 14, finalYNotes);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(cotizacion.notas, 14, finalYNotes + 5, { maxWidth: 180 });
  }

  // Open in new tab
  window.open(doc.output('bloburl'), '_blank');
};

export const generarReporteTablaPDF = (titulo: string, subtitulo: string, columnas: string[], datos: any[][]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(titulo, 14, 20);
  
  if (subtitulo) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitulo, 14, 28);
  }

  autoTable(doc, {
    startY: subtitulo ? 35 : 30,
    head: [columnas],
    body: datos,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 }
  });

  window.open(doc.output('bloburl'), '_blank');
};

export const generarTicketPDF = (factura: Factura) => {
  // Configurado para formato de ticket 80mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200]
  });

  let y = 10;
  const c = 40; // centro

  doc.setFontSize(14);
  doc.text(companyInfo.name, c, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.text(`RUT: ${companyInfo.rut}`, c, y, { align: "center" });
  y += 4;
  doc.text(companyInfo.address, c, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text(`TICKET N° ${factura.numeroFactura}`, c, y, { align: "center" });
  y += 5;
  const fecha = new Date(factura.fechaEmision).toLocaleString();
  doc.setFontSize(8);
  doc.text(`Fecha: ${fecha}`, c, y, { align: "center" });
  y += 8;

  doc.line(5, y, 75, y);
  y += 5;
  doc.text("CANT   PRODUCTO", 5, y);
  doc.text("TOTAL", 75, y, { align: "right" });
  y += 4;
  doc.line(5, y, 75, y);
  y += 5;

  factura.detalles.forEach(d => {
    doc.text(`${Number(d.cantidad)} x`, 5, y);
    const prodName = doc.splitTextToSize(d.producto.nombre, 40);
    doc.text(prodName, 15, y);
    doc.text(`$${Number(d.subtotal).toLocaleString()}`, 75, y, { align: "right" });
    y += (4 * prodName.length);
  });

  y += 2;
  doc.line(5, y, 75, y);
  y += 6;
  doc.text(`SUBTOTAL:`, 5, y);
  doc.text(`$${Number(factura.subtotal).toLocaleString()}`, 75, y, { align: "right" });
  y += 4;
  
  if (factura.descuentoGlobal && Number(factura.descuentoGlobal) > 0) {
    doc.text(`DESCUENTO:`, 5, y);
    doc.text(`-$${Number(factura.descuentoGlobal).toLocaleString()}`, 75, y, { align: "right" });
    y += 4;
  }

  doc.text(`IVA (${factura.impuestoPorcentaje}%):`, 5, y);
  doc.text(`$${Number(factura.impuestoValor).toLocaleString()}`, 75, y, { align: "right" });
  y += 6;

  doc.setFontSize(12);
  doc.text(`TOTAL:`, 5, y);
  doc.text(`$${Number(factura.total).toLocaleString()}`, 75, y, { align: "right" });
  y += 8;

  doc.setFontSize(8);
  doc.text("¡Gracias por su compra!", c, y, { align: "center" });

  window.open(doc.output('bloburl'), '_blank');
};
