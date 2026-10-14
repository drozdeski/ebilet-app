import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {RailCarrier, TrainTicket} from '../types/ticket';

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

function expandStationName(name: string): string {
  let cleaned = name.trim();
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
  return cleaned;
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
    // Fill white background first
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page1.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // Full page preview
    pdfPagePreviewUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Extract Aztec/QR code region on the left:
    // In eTravel ticket layout, the barcode is located on the left side:
    // x: roughly 4% to 33% of page width
    // y: roughly 33% to 56% of page height
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

  // -------------------------------------------------------------
  // Data extraction using targeted rules for eTravel / PKP tickets
  // -------------------------------------------------------------
  const ticket: Partial<TrainTicket> = {
    carrier: 'PKP Intercity',
    travelClass: '2',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 1. Ticket Number (e.g. "Bilet nr WL 95054990" or "Bilet nr: WL 95054982")
  const ticketNrMatch = fullText.match(
    /Bilet\s*(?:nr\.?|numer)?\s*[:.-]?\s*([A-Z]{1,3}\s*\d{6,12})/i
  );
  if (ticketNrMatch) {
    ticket.ticketNumber = ticketNrMatch[1].trim();
  }

  // 2. Passenger Name (e.g. "Tomasz Drozdowicz to Twój plan podróży" or "Podróżny: Tomasz Drozdowicz")
  const passengerMatch =
    fullText.match(
      /([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+?)\s+to\s+Tw[oó]j\s+plan\s+podr[oó][żz]y/i
    ) ||
    fullText.match(
      /(?:podr[oó][żz]ny|pasa[żz]er)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+?)(?=\s+to|\s+relacja|\n|$)/i
    );
  if (passengerMatch) {
    ticket.passengerName = passengerMatch[1].trim();
  }

  // 3. Train Number & Category (e.g. "EIP 1604", "EIC 6100", "IC 5310")
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

  // 4. Route (e.g. "Warszawa Centr. -> Wrocław Gł." or "Wrocław Gł. -> Warszawa Centr.")
  const routeMatch = fullText.match(
    /([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.]+?)\s*(?:->|–|-|do)\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.]+?)(?=\s+\d{1,2}:\d{2}|\s+Informacje|\s+Przejazd|\()/i
  );
  if (routeMatch) {
    ticket.departureStation = expandStationName(routeMatch[1]);
    ticket.arrivalStation = expandStationName(routeMatch[2]);
  }

  // 5. Times & Date (e.g. "16:44 - 20:16" or "17:01 - 20:44", "24.09.2026" or "22.09.2026")
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

  // 6. Wagon & Seat (e.g. "2 Wagon bezprzedziałowy" and "24 środek", or "13 Wagon przedziałowy" and "62 korytarz")
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
    // Fallback seat search
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

  // Barcode data fallback
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
