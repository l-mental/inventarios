import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotationPdfItem {
  code: string;
  quantity: number;
  description: string;
  unitPrice: number;
  subtotal: number;
}

export interface QuotationPdfPayload {
  quoteNumber: string;
  dateFormatted: string;
  customerName: string;
  customerCode: string;
  customerNit: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  sellerName: string;
  items: QuotationPdfItem[];
  observations: string;
  exchangeRate: number;
  currencyMode?: 'USD_TO_BS' | 'BS_SCALED' | 'BS_DIRECT';
  tractorModel: string;
  saleCondition: string;
  validityLabel: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
}

export const MONTANO_DEFAULTS = {
  companyName: 'MONTAÑO TRACTOR PARTES Y SERVICIOS',
  address: 'AV. BLANCO GALINDO - KM6 URBANIZACIÓN SAUSALITO',
  phone: '70748998 - 71438265',
  website: 'www.montanotractor.com',
};

interface CachedPdfAssets {
  montanoLogo?: string;
  fiatagriLogo?: string;
  brandsStrip?: string;
}

let cachedAssets: CachedPdfAssets | null = null;
let preloadPromise: Promise<CachedPdfAssets> | null = null;

async function fetchImageAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string | undefined>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function preloadQuotationAssets(): Promise<CachedPdfAssets> {
  if (cachedAssets) return cachedAssets;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const [montanoLogo, fiatagriLogo, brandsStrip] = await Promise.all([
      fetchImageAsDataUrl('/assets/aistudio/image_a7848fea.png'),
      fetchImageAsDataUrl('/assets/fiatagri_logo.png'),
      fetchImageAsDataUrl('/assets/brands_strip.png'),
    ]);
    cachedAssets = { montanoLogo, fiatagriLogo, brandsStrip };
    return cachedAssets;
  })();

  return preloadPromise;
}

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS_ESPECIALES = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];
const VEINTIS = [
  'VEINTE', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO',
  'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
  'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c] ? CENTENAS[c] + (resto > 0 ? ' ' : '') : '';

  if (resto === 0) return texto;
  if (resto < 10) return texto + UNIDADES[resto];
  if (resto < 20) return texto + DECENAS_ESPECIALES[resto - 10];
  if (resto < 30) return texto + VEINTIS[resto - 20];

  const d = Math.floor(resto / 10);
  const u = resto % 10;
  texto += DECENAS[d];
  if (u > 0) texto += ` Y ${UNIDADES[u]}`;
  return texto;
}

function convertirEntero(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const cientos = n % 1000;
  const partes: string[] = [];

  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : `${convertirGrupo(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${convertirGrupo(miles)} MIL`);
  }
  if (cientos > 0) {
    partes.push(convertirGrupo(cientos));
  }
  return partes.join(' ').trim();
}

export function numeroALetrasBolivianos(amount: number): string {
  const safe = Math.max(0, Number(amount || 0));
  const entero = Math.floor(safe);
  const centavos = Math.round((safe - entero) * 100);
  const enteroAjustado = centavos === 100 ? entero + 1 : entero;
  const centavosFinal = centavos === 100 ? 0 : centavos;
  const cc = String(centavosFinal).padStart(2, '0');
  const letras = enteroAjustado === 1 ? 'UN' : convertirEntero(enteroAjustado);
  return `${letras} ${cc}/100 BOLIVIANOS`;
}

function drawFallbackTractorHeader(doc: jsPDF, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(25, 25, 25);
  doc.text('MONTAÑO', x + 19, y + 4, { align: 'center' });

  doc.setFillColor(45, 45, 45);
  doc.setDrawColor(45, 45, 45);
  doc.rect(x + 9, y + 10, 15, 5.5, 'F');
  doc.rect(x + 11.5, y + 7, 1.4, 3.2, 'F');
  doc.setLineWidth(0.9);
  doc.rect(x + 19.5, y + 6.5, 6.5, 5.5);
  doc.circle(x + 23.5, y + 16, 4.2, 'F');
  doc.circle(x + 11.5, y + 17.5, 2.5, 'F');

  doc.setFontSize(11);
  doc.setTextColor(55, 55, 55);
  doc.text('TRACTOR', x + 19, y + 24.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(185, 28, 28);
  doc.text('PARTES Y SERVICIOS', x + 19, y + 28, { align: 'center' });
}

function drawFooterIcons(doc: jsPDF, cx: number, addrY: number, phoneY: number, webY: number, addrW: number, phoneW: number, webW: number) {
  // Location Pin icon left of address
  const pinX = cx - addrW / 2 - 4.2;
  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.35);
  doc.circle(pinX, addrY - 1.4, 1.3, 'S');
  doc.line(pinX - 1.0, addrY - 0.6, pinX, addrY + 1.0);
  doc.line(pinX + 1.0, addrY - 0.6, pinX, addrY + 1.0);

  // WhatsApp green circle icon left of phone
  const waX = cx - phoneW / 2 - 4.5;
  doc.setFillColor(37, 211, 102);
  doc.circle(waX, phoneY - 0.9, 1.8, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.circle(waX, phoneY - 0.9, 0.85, 'S');
  doc.line(waX - 0.3, phoneY - 0.5, waX + 0.35, phoneY - 1.15);

  // Browser/Web icon left of website
  const wbX = cx - webW / 2 - 4.5;
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.3);
  doc.rect(wbX - 1.6, webY - 2.3, 3.2, 2.6, 'S');
  doc.line(wbX - 1.6, webY - 1.4, wbX + 1.6, webY - 1.4);
}

export function generateQuotationPdf(data: QuotationPdfPayload, assets?: CachedPdfAssets): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const resolvedAssets = assets || cachedAssets || {};
  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 279.4mm
  const marginX = 13;
  const contentWidth = pageWidth - marginX * 2;

  const companyAddress = MONTANO_DEFAULTS.address;
  const companyPhone = data.companyPhone && data.companyPhone !== '77889900' ? data.companyPhone : MONTANO_DEFAULTS.phone;
  const companyWebsite = data.companyWebsite && data.companyWebsite !== 'www.agropartestractores.com'
    ? data.companyWebsite
    : MONTANO_DEFAULTS.website;

  // 1. Top Header: Centered COTIZACIÓN + Right Box N° COTIZACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 15, 15);
  doc.text('COTIZACIÓN', pageWidth / 2 - 12, 31, { align: 'center' });

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.roundedRect(156, 13, 47, 19, 2.5, 2.5, 'S');
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(`N° COTIZACIÓN : ${data.quoteNumber}`, 179.5, 24, { align: 'center' });

  // 2. Customer Box (left) & MONTAÑO TRACTOR Logo (right)
  const custBoxX = marginX;
  const custBoxY = 44;
  const custBoxW = 141;
  const custBoxH = 26;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.roundedRect(custBoxX, custBoxY, custBoxW, custBoxH, 2.5, 2.5, 'S');

  doc.setFontSize(8);
  const leftLabels: [string, string, number][] = [
    ['Cliente:', (data.customerName || 'CLIENTE GENERAL').toUpperCase(), custBoxY + 5.5],
    ['Código Cliente:', data.customerCode || 'S/N', custBoxY + 10.5],
    ['NIT/C.I. R.S.:', data.customerNit || 'S/N', custBoxY + 17.5],
    ['Cel-Tel:', data.customerPhone || 'S/N', custBoxY + 22.5],
  ];

  leftLabels.forEach(([label, val, ly]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(label, custBoxX + 3, ly);
    doc.setFont('helvetica', 'normal');
    const clipped = doc.splitTextToSize(val, 52)[0] || '';
    doc.text(clipped, custBoxX + 29, ly);
  });

  const rightColX = custBoxX + 83;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', rightColX, custBoxY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateFormatted, rightColX + 18, custBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección /', rightColX, custBoxY + 10.5);
  doc.text('Ciudad:', rightColX, custBoxY + 14.2);
  doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize((data.customerAddress || 'SANTA CRUZ / BOLIVIA').toUpperCase(), 38);
  doc.text(addrLines[0] || '', rightColX + 18, custBoxY + 10.5);
  if (addrLines[1]) doc.text(addrLines[1], rightColX + 18, custBoxY + 14.2);

  doc.setFont('helvetica', 'bold');
  doc.text('Correo:', rightColX, custBoxY + 18.2);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(data.customerEmail || 'S/N', 38)[0] || 'S/N', rightColX + 18, custBoxY + 18.2);

  doc.setFont('helvetica', 'bold');
  doc.text('Vendedor:', rightColX, custBoxY + 22.8);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(data.sellerName || 'Ventas Mostrador', 38)[0] || '', rightColX + 18, custBoxY + 22.8);

  // Top-right exact MONTAÑO TRACTOR PARTES Y SERVICIOS logo
  if (resolvedAssets.montanoLogo) {
    doc.addImage(resolvedAssets.montanoLogo, 'PNG', 161.5, 40.5, 36, 32.6);
  } else {
    drawFallbackTractorHeader(doc, 160, 41);
  }

  // 3. Salutation Box
  const salY = 74.5;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, salY, contentWidth, 9.5, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 15, 15);
  doc.text('De nuestras consideraciones:', marginX + 2.5, salY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('A continuación presentamos nuestra oferta para la provisión de los siguientes repuestos:', marginX + 2.5, salY + 8);

  // 4. Detail Table: DETALLE DE COTIZACIÓN
  const minVisualRows = 5;
  const tableRows: (string | number)[][] = data.items.map((item, idx) => [
    String(idx + 1),
    item.code || '-',
    Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2),
    item.description.toUpperCase(),
    item.unitPrice.toFixed(2),
    item.subtotal.toFixed(2),
  ]);

  while (tableRows.length < minVisualRows) {
    tableRows.push([String(tableRows.length + 1), '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 86.5,
    margin: { left: marginX, right: marginX },
    head: [
      [
        {
          content: 'DETALLE DE COTIZACIÓN',
          colSpan: 6,
          styles: {
            fillColor: [75, 75, 75],
            textColor: [255, 255, 255],
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 8.8,
            cellPadding: 1.8,
          },
        },
      ],
      ['ITEM', 'CÓDIGO', 'CANTIDAD', 'DESCRIPCIÓN', 'PRECIO', 'TOTAL BS'],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [20, 20, 20],
      lineColor: [30, 30, 30],
      lineWidth: 0.25,
      cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: [205, 205, 205],
      textColor: [15, 15, 15],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 23, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
  });

  const finalTableY = ((doc as any).lastAutoTable?.finalY as number) || 130;

  // 5. Observations + Exchange Rate line right under table
  let cursorY = finalTableY + 4.5;
  if (cursorY > pageHeight - 95) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  const obsText = `Obs: ${data.observations || 'SIN OBSERVACIONES'}`;
  const obsLines = doc.splitTextToSize(obsText, 112);
  doc.text(obsLines, marginX, cursorY);

  const obsOffset = Math.max(obsLines.length * 3.5, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 64, 175);
  doc.text(
    `Tipo de Cambio Aplicado: 1 USD = ${Number(data.exchangeRate || 6.96).toFixed(2)} Bs`,
    marginX,
    cursorY + obsOffset + 1
  );

  // 6. Right-side Totals Box
  const totalsX = 129;
  const totalsY = finalTableY + 2.5;
  const labelW = 48;
  const valW = 26;
  const rowH = 6.2;

  const totalsRows: {
    label: string;
    value: string;
    bg: readonly [number, number, number];
    bold?: boolean;
  }[] = [
    { label: 'SUBTOTAL BS', value: data.subtotal.toFixed(2), bg: [232, 232, 232], bold: true },
    { label: 'DESCUENTO', value: data.discount.toFixed(2), bg: [224, 224, 224], bold: true },
    { label: 'TOTAL BS', value: data.total.toFixed(2), bg: [204, 204, 204], bold: true },
    { label: 'PAGADO BS', value: data.paidAmount.toFixed(2), bg: [252, 240, 204], bold: true },
    { label: 'SALDO BS', value: data.balanceAmount.toFixed(2), bg: [207, 236, 244], bold: true },
  ];

  totalsRows.forEach((tr, i) => {
    const ry = totalsY + i * rowH;
    doc.setFillColor(tr.bg[0], tr.bg[1], tr.bg[2]);
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.25);
    doc.rect(totalsX, ry, labelW + valW, rowH, 'FD');

    doc.setFont('helvetica', tr.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(25, 25, 25);
    doc.text(tr.label, totalsX + labelW - 2, ry + 4.3, { align: 'right' });
    doc.text(tr.value, totalsX + labelW + valW - 2, ry + 4.3, { align: 'right' });
  });

  // 7. Left Metadata Stack
  const leftMetaY = totalsY + 22;
  const leftLineW = 78;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(20, 20, 20);
  const sonText = `SON: ${numeroALetrasBolivianos(data.total)}`;
  const sonLines = doc.splitTextToSize(sonText, 110);
  doc.text(sonLines, marginX, leftMetaY);

  let metaY = leftMetaY + Math.max(sonLines.length * 3.8, 5) + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(20, 20, 20);
  doc.text('MODELO DEL TRACTOR', marginX, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text((data.tractorModel || 'REPUESTOS').toUpperCase(), marginX + 1.5, metaY + 4.2);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(marginX, metaY + 5.6, marginX + leftLineW, metaY + 5.6);

  metaY += 10.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('CONDICIONES DE VENTA (STOCK O PEDIDO)', marginX, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.saleCondition || 'Stock', marginX + 1.5, metaY + 4.2);
  doc.line(marginX, metaY + 5.6, marginX + leftLineW, metaY + 5.6);

  metaY += 10.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(195, 25, 25);
  doc.text('TIEMPO DE VALIDEZ', marginX, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.validityLabel || '7 días', marginX + 1.5, metaY + 4.2);
  doc.setDrawColor(195, 25, 25);
  doc.line(marginX, metaY + 5.6, marginX + leftLineW, metaY + 5.6);

  metaY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(35, 35, 35);
  doc.text('*PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO*', marginX, metaY);

  // 8. Right FIATAGRI Emblem & Contact Footer below Totals
  const rightLogoY = totalsY + totalsRows.length * rowH + 5;
  const cx = totalsX + 37;

  if (resolvedAssets.fiatagriLogo) {
    // 87x52 aspect ratio => 25.5 x 15.2 mm
    doc.addImage(resolvedAssets.fiatagriLogo, 'PNG', cx - 12.75, rightLogoY, 25.5, 15.2);
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(125, 62, 52);
    doc.text('FIATAGRI', cx, rightLogoY + 12, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(35, 35, 35);
  const addrY = rightLogoY + 21;
  const phoneY = addrY + 4.8;
  const webY = phoneY + 4.8;

  const addrText = companyAddress.toUpperCase();
  const phoneText = companyPhone;
  const webText = companyWebsite;

  doc.text(addrText, cx + 2, addrY, { align: 'center' });
  doc.text(phoneText, cx + 2, phoneY, { align: 'center' });
  doc.text(webText, cx + 2, webY, { align: 'center' });

  drawFooterIcons(
    doc,
    cx + 2,
    addrY,
    phoneY,
    webY,
    doc.getTextWidth(addrText),
    doc.getTextWidth(phoneText),
    doc.getTextWidth(webText)
  );

  // 9. Bottom Brand Badges Strip (exact uploaded brands_strip.png)
  if (resolvedAssets.brandsStrip) {
    // 613x42 => width 186mm -> height 12.74mm
    doc.addImage(resolvedAssets.brandsStrip, 'PNG', 15, pageHeight - 23.5, pageWidth - 30, 12.8);
  }

  return doc;
}

export function getQuotationPdfFilename(quoteNumber: string) {
  const safeNum = String(quoteNumber || '00001').replace(/[^a-zA-Z0-9_-]/g, '');
  return `Cotizacion_${safeNum}.pdf`;
}

export async function downloadQuotationPdf(data: QuotationPdfPayload): Promise<string> {
  const assets = await preloadQuotationAssets();
  const doc = generateQuotationPdf(data, assets);
  const filename = getQuotationPdfFilename(data.quoteNumber);
  doc.save(filename);
  return filename;
}

export async function getQuotationPdfBlob(data: QuotationPdfPayload): Promise<Blob> {
  const assets = await preloadQuotationAssets();
  const doc = generateQuotationPdf(data, assets);
  return doc.output('blob');
}

export async function getQuotationPdfBlobUrl(data: QuotationPdfPayload): Promise<string> {
  const blob = await getQuotationPdfBlob(data);
  return URL.createObjectURL(blob);
}

export async function openQuotationPdfInNewTab(data: QuotationPdfPayload) {
  const url = await getQuotationPdfBlobUrl(data);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function shareQuotationPdfViaWhatsApp(
  data: QuotationPdfPayload,
  phone: string
): Promise<{ mode: 'native_share' | 'download_and_wa'; filename: string; waUrl?: string }> {
  const assets = await preloadQuotationAssets();
  const doc = generateQuotationPdf(data, assets);
  const filename = getQuotationPdfFilename(data.quoteNumber);
  const blob = doc.output('blob');
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] });
    if (canShareFiles) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Cotización N° ${data.quoteNumber}`,
          text: `Cotización N° ${data.quoteNumber} - MONTAÑO TRACTOR PARTES Y SERVICIOS (T.C. ${data.exchangeRate.toFixed(2)} Bs)`,
        });
        return { mode: 'native_share', filename };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { mode: 'native_share', filename };
        }
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = filename;
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  const cleanPhone = (phone || '').replace(/\D/g, '');
  const finalPhone = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;
  const caption = encodeURIComponent(
    `Estimado(a) ${data.customerName || 'Cliente'}, adjunto la Cotización N° ${data.quoteNumber} en formato PDF (Total: Bs ${data.total.toFixed(2)} | T.C.: ${data.exchangeRate.toFixed(2)} Bs).`
  );
  const waUrl = finalPhone ? `https://wa.me/${finalPhone}?text=${caption}` : `https://wa.me/?text=${caption}`;
  const waLink = document.createElement('a');
  waLink.href = waUrl;
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  document.body.appendChild(waLink);
  waLink.click();
  document.body.removeChild(waLink);

  return { mode: 'download_and_wa', filename, waUrl };
}
