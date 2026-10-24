import * as XLSX from 'xlsx';

/**
 * Descarga o comparte un archivo Blob según la plataforma (Web, iPadOS, iOS, Android).
 * En iPad / iPhone abre la hoja de compartir nativa (Guardar en Archivos, Abrir en Excel, AirDrop, etc.).
 * En PC / Mac activa la descarga directa del archivo en el navegador.
 */
export async function downloadOrShareBlob(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, {
    type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Si estamos en un dispositivo móvil/iPad con soporte para compartir archivos
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: fileName,
        text: `Exportación de archivo ${fileName}`
      });
      return;
    } catch (shareErr: any) {
      // Si el usuario canceló la hoja de compartir en iOS, salimos sin error
      if (shareErr.name === 'AbortError') return;
      console.warn('Share sheet no completado, intentando descarga directa:', shareErr);
    }
  }

  // Descarga estándar en navegadores de escritorio
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    window.URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Exporta un array de objetos JSON a un archivo Excel (.xlsx) con descarga multiplataforma.
 */
export async function exportJsonToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Datos'
): Promise<void> {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  await downloadOrShareBlob(blob, finalName);
}
