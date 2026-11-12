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

  // If multiple words still contain table header remnants, strip up to "miejsca" or "relacja"
  cleaned = cleaned.replace(/^.*\bmiejsca\s+/i, '').trim();
  cleaned = cleaned.replace(/^.*\brelacja\s*[:.-]?\s*/i, '').trim();

  cleaned = cleaned.replace(/Warszawa\s*Centr\.?/i, 'Warszawa Centralna');
  cleaned = cleaned.replace(/Warszawa\s*Zach\.?/i, 'Warszawa Zachodnia');
  cleaned = cleaned.replace(/Warszawa\s*Wsch\.?/i, 'Warszawa Wschodnia');
  cleaned = cleaned.replace(/Wroc[łl]aw\s*G[łl]\.?/i, 'Wrocław Główny');
  cleaned = cleaned.replace(/Krak[oó]w\s*G[łl]\.?/i, 'Kraków Główny');
  cleaned = cleaned.replace(/Gda[nń]sk\s*G[łl]\.?/i, 'Gdańsk Główny');
  cleaned = cleaned.replace(/Gdynia\s*G[łl]\.?/i, 'Gdynia Główna');
  cleaned = cleaned.replace(/Pozna[nń]\s*G[łl]\.?/i, 'Poznań Główny');
  cleaned = cleaned.replace(/Katowice\s*G[łl]\.?/i, 'Katowice');
  cleaned = cleaned.replace(/Szczecin\s*G[łl]\.?/i, 'Szczecin Główny');
  cleaned = cleaned.replace(/Opole\s*G[łl]\.?/i, 'Opole Główne');
  cleaned = cleaned.replace(/Bydgoszcz\s*G[łl]\.?/i, 'Bydgoszcz Główna');
  cleaned = cleaned.replace(/Toru[nń]\s*G[łl]\.?/i, 'Toruń Główny');
  cleaned = cleaned.replace(/Lublin\s*G[łl]\.?/i, 'Lublin Główny');
  return cleaned.trim();
}

export function cleanPassengerName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^.*?(?:Informacje\s+o\s+podr[oó][żz]y|Tw[oó]j\s+plan\s+podr[oó][żz]y|Podr[oó][żz]ny|Pasa[żz]er|Imi[eę]\s+i\s+nazwisko)\s*[:.-]?\s*/gi, '')
    .replace(/\s+to\s+Tw[oó]j\s+plan\s+podr[oó][żz]y.*$/i, '')
    .trim();
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

  // Render Page 1 to Canvas at high-res (scale 2.0)
  const scale = 2.0;
  const viewport = page1.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  let barcodeImageUrl: string | undefined = undefined;
  let pdfPagePreviewUrl: string | undefined = undefined;

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page1.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    pdfPagePreviewUrl = canvas.toDataURL('image/jpeg', 0.85);

    const barcodeBox = {
      x: Math.round(canvas.width * 0.04),
      y: Math.round(canvas.height * 0.33),
      w: Math.round(canvas.width * 0.30),
      h: Math.round(canvas.height * 0.22),
    };

    const barcodeCanvas = document.createElement('canvas');
    barcodeCanvas.width = barcodeBox.w;
    barcodeCanvas.height = barcodeBox.h;
    const bCtx = barcodeCanvas.getContext('2d');
    if (bCtx) {
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
      barcodeImageUrl = barcodeCanvas.toDataURL('image/png');
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
