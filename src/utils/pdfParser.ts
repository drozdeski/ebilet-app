import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {TrainTicket} from '../types/ticket';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ParsedPDFTicketResult {
  ticket: Partial<TrainTicket>;
  extractedText: string;
  barcodeImageUrl?: string;
  pdfPagePreviewUrl?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function cleanStationName(name: string): string {
  if (!name) return '';
  let cleaned = name
    // Strip common PDF table column headers that precede station names
    .replace(
      /^.*?(?:relacja|przew\.?|poc\.?|kl\.?|wagon|miejsca|odjazd|przyjazd|stacja|z\s+stacji)\s*/gi,
      ''
    )
    .replace(/^(?:relacja|przew\.?|poc\.?|kl\.?|wagon|miejsca|\s|-|:|\.)+/gi, '')
    .trim();

  cleaned = cleaned.replace(/^.*\bmiejsca\s+/i, '').trim();
  cleaned = cleaned.replace(/^.*\brelacja\s*[:.-]?\s*/i, '').trim();

  // Fix any previously duplicated suffixes (e.g. "Głównyównyówny", "Centralnaalnaalna")
  cleaned = cleaned.replace(/(G[łl][oó]wny)(?:[oó]wny)+/gi, '$1');
  cleaned = cleaned.replace(/(G[łl][oó]wna)(?:[oó]wna)+/gi, '$1');
  cleaned = cleaned.replace(/(G[łl][oó]wne)(?:[oó]wne)+/gi, '$1');
  cleaned = cleaned.replace(/(Centralna)(?:alna)+/gi, '$1');
  cleaned = cleaned.replace(/(Zachodnia)(?:odnia)+/gi, '$1');
  cleaned = cleaned.replace(/(Wschodnia)(?:odnia)+/gi, '$1');

  // Expand abbreviations ONLY when not already followed by letters
  cleaned = cleaned.replace(
    /Warszawa\s*Centr\.?(?![a-ząćęłńóśźż])/i,
    'Warszawa Centralna'
  );
  cleaned = cleaned.replace(
    /Warszawa\s*Zach\.?(?![a-ząćęłńóśźż])/i,
    'Warszawa Zachodnia'
  );
  cleaned = cleaned.replace(
    /Warszawa\s*Wsch\.?(?![a-ząćęłńóśźż])/i,
    'Warszawa Wschodnia'
  );
  cleaned = cleaned.replace(
    /Wroc[łl]aw\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Wrocław Główny'
  );
  cleaned = cleaned.replace(
    /Krak[oó]w\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Kraków Główny'
  );
  cleaned = cleaned.replace(
    /Gda[nń]sk\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Gdańsk Główny'
  );
  cleaned = cleaned.replace(
    /Gdynia\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Gdynia Główna'
  );
  cleaned = cleaned.replace(
    /Pozna[nń]\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Poznań Główny'
  );
  cleaned = cleaned.replace(
    /Katowice\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Katowice'
  );
  cleaned = cleaned.replace(
    /Szczecin\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Szczecin Główny'
  );
  cleaned = cleaned.replace(
    /Opole\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Opole Główne'
  );
  cleaned = cleaned.replace(
    /Bydgoszcz\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Bydgoszcz Główna'
  );
  cleaned = cleaned.replace(
    /Toru[nń]\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Toruń Główny'
  );
  cleaned = cleaned.replace(
    /Lublin\s*G[łl]\.?(?![a-ząćęłńóśźż])/i,
    'Lublin Główny'
  );

  return cleaned.trim();
}

export function cleanPassengerName(name: string): string {
  if (!name) return '';
  return name
    .replace(
      /^.*?(?:Informacje\s+o\s+podr[oó][żz]y|Tw[oó]j\s+plan\s+podr[oó][żz]y|Podr[oó][żz]ny|Pasa[żz]er|Imi[eę]\s+i\s+nazwisko)\s*[:.-]?\s*/gi,
      ''
    )
    .replace(/\s+to\s+Tw[oó]j\s+plan\s+podr[oó][żz]y.*$/i, '')
    .trim();
}

/**
 * Applies crisp black/white thresholding and tight bounding-box cropping
 * to a rendered Aztec / QR barcode canvas so it is razor-sharp on high-DPI screens.
 */
function sharpenAndTrimBarcodeCanvas(sourceCanvas: HTMLCanvasElement): string {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL('image/png');

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  // Threshold luminance to crisp pure black (#000000) or pure white (#FFFFFF)
  const threshold = 175;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum < threshold) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // If valid dark modules were found, crop tightly around the barcode with a clean quiet zone
  if (maxX > minX && maxY > minY) {
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(h - cropY, maxY - minY + pad * 2);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const outCtx = outCanvas.getContext('2d');
    if (outCtx) {
      outCtx.imageSmoothingEnabled = false;
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, cropW, cropH);
      outCtx.drawImage(
        sourceCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
      return outCanvas.toDataURL('image/png');
    }
  }

  return sourceCanvas.toDataURL('image/png');
}

/**
 * Re-extracts an ultra-high-resolution (scale 4.5) crisp Aztec barcode
 * from a base64 PDF Data URL for already-stored tickets.
 */
export async function extractHighResBarcodeFromDataUrl(
  pdfDataUrl: string
): Promise<string | undefined> {
  try {
    const base64Marker = ';base64,';
    const base64Index = pdfDataUrl.indexOf(base64Marker);
    if (base64Index === -1) return undefined;
    const base64 = pdfDataUrl.slice(base64Index + base64Marker.length);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const page1 = await pdf.getPage(1);

    // Render at 4.5x scale for razor-sharp barcode modules
    const hiScale = 4.5;
    const hiViewport = page1.getViewport({scale: hiScale});
    const hiCanvas = document.createElement('canvas');
    hiCanvas.width = hiViewport.width;
    hiCanvas.height = hiViewport.height;
    const hiCtx = hiCanvas.getContext('2d');
    if (!hiCtx) return undefined;

    hiCtx.imageSmoothingEnabled = false;
    hiCtx.fillStyle = '#ffffff';
    hiCtx.fillRect(0, 0, hiCanvas.width, hiCanvas.height);

    await page1.render({
      canvasContext: hiCtx,
      viewport: hiViewport,
      canvas: hiCanvas,
    }).promise;

    const barcodeBox = {
      x: Math.round(hiCanvas.width * 0.045),
      y: Math.round(hiCanvas.height * 0.335),
      w: Math.round(hiCanvas.width * 0.29),
      h: Math.round(hiCanvas.height * 0.215),
    };

    const barcodeCanvas = document.createElement('canvas');
    barcodeCanvas.width = barcodeBox.w;
    barcodeCanvas.height = barcodeBox.h;
    const bCtx = barcodeCanvas.getContext('2d');
    if (!bCtx) return undefined;

    bCtx.imageSmoothingEnabled = false;
    bCtx.drawImage(
      hiCanvas,
      barcodeBox.x,
      barcodeBox.y,
      barcodeBox.w,
      barcodeBox.h,
      0,
      0,
      barcodeBox.w,
      barcodeBox.h
    );

    return sharpenAndTrimBarcodeCanvas(barcodeCanvas);
  } catch (e) {
    console.warn('Nie udało się wygenerować kodu HD:', e);
    return undefined;
  }
}

export async function parsePDFTicket(
  fileOrBuffer: File | ArrayBuffer
): Promise<ParsedPDFTicketResult> {
  const arrayBuffer =
    fileOrBuffer instanceof File
      ? await fileOrBuffer.arrayBuffer()
      : fileOrBuffer;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';
  const page1 = await pdf.getPage(1);
  const textContent = await page1.getTextContent();
  const page1Text = textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');
  fullText += page1Text;

  if (numPages > 1) {
    for (let i = 2; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      fullText +=
        ' ' +
        tc.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    }
  }

  // Render Page 1 at high resolution (scale 4.0) so barcode is ultra-crisp
  const scale = 4.0;
  const viewport = page1.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  let barcodeImageUrl: string | undefined = undefined;
  let pdfPagePreviewUrl: string | undefined = undefined;

  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page1.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // Downscale a preview image for the full page attachment viewer to save memory
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = Math.round(canvas.width * 0.5);
    previewCanvas.height = Math.round(canvas.height * 0.5);
    const pCtx = previewCanvas.getContext('2d');
    if (pCtx) {
      pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      pdfPagePreviewUrl = previewCanvas.toDataURL('image/jpeg', 0.85);
    }

    // Extract Aztec/QR code region at full 4.0x scale and binarize for crystal clarity
    const barcodeBox = {
      x: Math.round(canvas.width * 0.045),
      y: Math.round(canvas.height * 0.335),
      w: Math.round(canvas.width * 0.29),
      h: Math.round(canvas.height * 0.215),
    };

    const barcodeCanvas = document.createElement('canvas');
    barcodeCanvas.width = barcodeBox.w;
    barcodeCanvas.height = barcodeBox.h;
    const bCtx = barcodeCanvas.getContext('2d');
    if (bCtx) {
      bCtx.imageSmoothingEnabled = false;
      bCtx.drawImage(
        canvas,
        barcodeBox.x,
        barcodeBox.y,
        barcodeBox.w,
        barcodeBox.h,
        0,
        0,
        barcodeBox.w,
        barcodeBox.h
      );
      barcodeImageUrl = sharpenAndTrimBarcodeCanvas(barcodeCanvas);
    }
  }

  const ticket: Partial<TrainTicket> = {
    carrier: 'PKP Intercity',
    travelClass: '2',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 1. Ticket Number
  const ticketNrMatch = fullText.match(
    /Bilet\s*(?:nr\.?|numer)?\s*[:.-]?\s*([A-Z]{1,3}\s*\d{6,12})/i
  );
  if (ticketNrMatch) {
    ticket.ticketNumber = ticketNrMatch[1].trim();
  }

  // 2. Passenger Name
  const passengerMatch =
    fullText.match(
      /(?:Informacje\s+o\s+podr[oó][żz]y\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż-]+)+)\s+to\s+Tw[oó]j\s+plan\s+podr[oó][żz]y/
    ) ||
    fullText.match(
      /([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+?)\s+to\s+Tw[oó]j\s+plan\s+podr[oó][żz]y/i
    ) ||
    fullText.match(
      /(?:podr[oó][żz]ny|pasa[żz]er)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+?)(?=\s+to|\s+relacja|\n|$)/i
    );
  if (passengerMatch) {
    ticket.passengerName = cleanPassengerName(passengerMatch[1]);
  }

  // 3. Train Number & Category
  const trainMatch = fullText.match(
    /\b(EIP|EIC|IC|TLK)\s*(\d{3,5})\b/i
  );
  if (trainMatch) {
    const category = trainMatch[1].toUpperCase();
    const number = trainMatch[2];
    ticket.trainNumber = `${category} ${number}`;
    if (category === 'EIP') {
      ticket.trainName = 'Pendolino';
    } else if (category === 'EIC') {
      ticket.trainName = 'Express InterCity';
    } else if (category === 'IC') {
      ticket.trainName = 'InterCity';
    }
  }

  // 4. Route
  const routeMatch = fullText.match(
    /([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.]+?)\s*(?:->|–|-|do)\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.]+?)(?=\s+\d{1,2}:\d{2}|\s+Informacje|\s+Przejazd|\()/i
  );
  if (routeMatch) {
    ticket.departureStation = cleanStationName(routeMatch[1]);
    ticket.arrivalStation = cleanStationName(routeMatch[2]);
  }

  // 5. Times & Date
  const timeMatch = fullText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const dateMatch = fullText.match(/(\d{2})\.(\d{2})\.(\d{4})/);

  let formattedDate = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (timeMatch) {
    ticket.departureTime = `${formattedDate}T${timeMatch[1].padStart(5, '0')}`;
    ticket.arrivalTime = `${formattedDate}T${timeMatch[2].padStart(5, '0')}`;
  }

  // 6. Wagon & Seat
  const wagonMatch = fullText.match(
    /(\d{1,3})\s*Wagon(?:\s*(bezprzedzia[łl]owy|przedzia[łl]owy))?/i
  );
  if (wagonMatch) {
    ticket.carNumber = wagonMatch[1].padStart(2, '0');
    if (wagonMatch[2]) {
      ticket.seatType =
        wagonMatch[2].toLowerCase() === 'bezprzedziałowy'
          ? 'Bezprzedziałowy'
          : 'Przedział';
    }
  }

  const seatMatch = fullText.match(
    /\b(\d{1,3})\s*(środek|srodek|okno|korytarz)\b/i
  );
  if (seatMatch) {
    ticket.seatNumber = seatMatch[1];
    const typeStr = seatMatch[2].toLowerCase();
    if (typeStr.includes('okno')) ticket.seatType = 'Okno';
    else if (typeStr.includes('korytarz')) ticket.seatType = 'Korytarz';
    else if (typeStr.includes('srodek') || typeStr.includes('środek'))
      ticket.seatType = 'Środek';
  } else {
    const fallbackSeat = fullText.match(/miejsca\s*(\d{1,3})/i);
    if (fallbackSeat) {
      ticket.seatNumber = fallbackSeat[1];
    }
  }

  // 7. Booking reference & Emergency code
  const refMatch = fullText.match(/Nr\s*referencyjny\s*[:.-]?\s*(\d+)/i);
  if (refMatch) {
    ticket.bookingReference = refMatch[1].trim();
  }

  const emergMatch = fullText.match(/Kod\s*awaryjny\s*[:.-]?\s*(\d+)/i);
  if (emergMatch) {
    ticket.emergencyCode = emergMatch[1].trim();
  }

  // 8. Price
  const priceMatch =
    fullText.match(/Razem\s*w\s*tym\s*VAT\s*([\d,.]+)\s*z[łl]/i) ||
    fullText.match(/Nale[żz]no[sś][ćc]\s*\(z[łl]\)\s*([\d,.]+)/i);
  if (priceMatch) {
    ticket.price = `${priceMatch[1].replace(',', '.')} PLN`;
  }

  // 9. Carrier detection
  if (/etravel/i.test(fullText)) {
    ticket.carrier = 'eTravel';
  } else if (/polregio/i.test(fullText)) {
    ticket.carrier = 'Polregio';
  } else if (/pkp\s*ic|intercity/i.test(fullText)) {
    ticket.carrier = 'PKP Intercity';
  }

  ticket.barcodeData =
    ticket.ticketNumber ||
    ticket.bookingReference ||
    `PKP#${ticket.trainNumber || ''}#W${ticket.carNumber || ''}#M${ticket.seatNumber || ''}#${ticket.passengerName || ''}`;

  if (barcodeImageUrl) {
    ticket.barcodeImageUrl = barcodeImageUrl;
  }
  if (pdfPagePreviewUrl) {
    ticket.pdfPagePreviewUrl = pdfPagePreviewUrl;
  }

  const isComplete =
    !!ticket.departureStation &&
    !!ticket.arrivalStation &&
    !!ticket.trainNumber &&
    !!ticket.carNumber &&
    !!ticket.seatNumber;

  return {
    ticket,
    extractedText: fullText,
    barcodeImageUrl,
    pdfPagePreviewUrl,
    confidence: isComplete ? 'high' : 'medium',
  };
}
