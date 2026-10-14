import {RailCarrier, TrainTicket} from '../types/ticket';

export interface ParsedTicketData {
  carrier?: RailCarrier;
  trainNumber?: string;
  trainName?: string;
  departureStation?: string;
  departureTime?: string;
  departurePlatform?: string;
  arrivalStation?: string;
  arrivalTime?: string;
  arrivalPlatform?: string;
  carNumber?: string;
  seatNumber?: string;
  travelClass?: '1' | '2';
  seatType?: 'Okno' | 'Korytarz' | 'Środek' | 'Przedział' | 'Bezprzedziałowy';
  passengerName?: string;
  ticketNumber?: string;
  bookingReference?: string;
  price?: string;
  barcodeData?: string;
}

export function parseBookingText(rawText: string): ParsedTicketData {
  const result: ParsedTicketData = {};
  const text = rawText.replace(/\r\n/g, '\n');

  // Detect Carrier
  if (/polregio/i.test(text)) {
    result.carrier = 'Polregio';
  } else if (/koleje mazowieckie|km/i.test(text)) {
    result.carrier = 'Koleje Mazowieckie';
  } else if (/koleje dolnośląskie|kd/i.test(text)) {
    result.carrier = 'Koleje Dolnośląskie';
  } else if (/koleje śląskie|kś/i.test(text)) {
    result.carrier = 'Koleje Śląskie';
  } else if (/deutsche bahn|db/i.test(text)) {
    result.carrier = 'Deutsche Bahn';
  } else if (/intercity|eip|tlk|pendolino|pkp/i.test(text)) {
    result.carrier = 'PKP Intercity';
  } else if (/etravel/i.test(text)) {
    result.carrier = 'eTravel';
  }

  // Train Number (e.g. "EIP 1301", "IC 5310", "TLK 38100", "Pociąg: EIP 1301", "Nr: IC 5310")
  const trainMatch = text.match(
    /(?:poci[aą]g|nr poci[aą]gu|train|nr)\s*[:.-]?\s*([A-Z]{1,3}\s*\d{3,5})/i
  ) || text.match(/\b(EIP\s*\d{3,5}|IC\s*\d{3,5}|TLK\s*\d{3,5}|EIC\s*\d{3,5}|R\s*\d{4,5})\b/i);
  if (trainMatch) {
    result.trainNumber = trainMatch[1].trim().toUpperCase();
    if (result.trainNumber.startsWith('EIP')) {
      result.trainName = 'Pendolino';
    }
  }

  // Wagon / Car number (e.g. "Wagon: 04", "Wagon 4", "Car 4")
  const carMatch = text.match(/(?:wagon|car|coach)\s*[:.-]?\s*(\d{1,3})/i);
  if (carMatch) {
    result.carNumber = carMatch[1].padStart(2, '0');
  }

  // Seat number (e.g. "Miejsce: 52", "Msc: 52", "Seat 52")
  const seatMatch = text.match(
    /(?:miejsce|miejsca|msc|seat)\s*[:.-]?\s*(\d{1,3}|dowolne)/i
  );
  if (seatMatch) {
    result.seatNumber = seatMatch[1];
  }

  // Seat type
  if (/okno|window/i.test(text)) {
    result.seatType = 'Okno';
  } else if (/korytarz|aisle/i.test(text)) {
    result.seatType = 'Korytarz';
  } else if (/środek|middle/i.test(text)) {
    result.seatType = 'Środek';
  } else if (/bezprzedziałowy/i.test(text)) {
    result.seatType = 'Bezprzedziałowy';
  } else if (/przedział/i.test(text)) {
    result.seatType = 'Przedział';
  }

  // Class
  if (/klasa\s*1|1\s*klasa|1st class/i.test(text)) {
    result.travelClass = '1';
  } else if (/klasa\s*2|2\s*klasa|2nd class/i.test(text)) {
    result.travelClass = '2';
  }

  // Route / Stations
  // Format: "Relacja: Warszawa Centralna - Kraków Główny" or "Z: ... Do: ..." or "... -> ..."
  const routeMatch = text.match(
    /(?:relacja|trasa|route)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.-]+?)\s*(?:-|–|—|->|do)\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.-]+?)(?=\n|$|,|\()/i
  );
  if (routeMatch) {
    result.departureStation = routeMatch[1].trim();
    result.arrivalStation = routeMatch[2].trim();
  } else {
    const fromMatch = text.match(
      /(?:odjazd z|stacja pocz[aą]tkowa|z stacji|from|z)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.-]+?)(?=\n|$|,)/i
    );
    const toMatch = text.match(
      /(?:przyjazd do|stacja ko[nń]cowa|do stacji|to|do)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.-]+?)(?=\n|$|,)/i
    );
    if (fromMatch) result.departureStation = fromMatch[1].trim();
    if (toMatch) result.arrivalStation = toMatch[1].trim();
  }

  // Times / Dates
  // Patterns like "2026-10-14 14:25" or "14.10.2026 14:25" or "Odjazd: 14:25"
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{2}[./-]\d{2}[./-]\d{4})/);
  let resolvedDate = '';
  if (dateMatch) {
    if (dateMatch[1]) {
      resolvedDate = dateMatch[1];
    } else if (dateMatch[2]) {
      const parts = dateMatch[2].split(/[./-]/);
      resolvedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } else {
    // default today
    resolvedDate = new Date().toISOString().slice(0, 10);
  }

  const depTimeMatch = text.match(
    /(?:odjazd|departure|godz\.?\s*odj\.?)\s*[:.-]?\s*(\d{1,2}:\d{2})/i
  );
  if (depTimeMatch) {
    result.departureTime = `${resolvedDate}T${depTimeMatch[1].padStart(5, '0')}`;
  }

  const arrTimeMatch = text.match(
    /(?:przyjazd|arrival|godz\.?\s*przyj\.?)\s*[:.-]?\s*(\d{1,2}:\d{2})/i
  );
  if (arrTimeMatch) {
    result.arrivalTime = `${resolvedDate}T${arrTimeMatch[1].padStart(5, '0')}`;
  }

  // Platforms
  const depPlatMatch = text.match(
    /(?:peron\s*odjazdu|peron)\s*[:.-]?\s*([0-9IVX]+(?:\s*tor\s*\d+)?)/i
  );
  if (depPlatMatch) {
    result.departurePlatform = `Peron ${depPlatMatch[1]}`;
  }

  // Passenger Name
  const nameMatch = text.match(
    /(?:podr[oó][żz]ny|pasa[żz]er|passenger|imi[eę]\s*i\s*nazwisko)\s*[:.-]?\s*([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+?)(?=\n|$|,|\()/i
  );
  if (nameMatch) {
    result.passengerName = nameMatch[1].trim();
  }

  // Ticket number / PNR
  const ticketNumMatch = text.match(
    /(?:bilet\s*nr|nr\s*biletu|ticket\s*no\.?)\s*[:.-]?\s*([A-Za-z0-9-]+)/i
  );
  if (ticketNumMatch) {
    result.ticketNumber = ticketNumMatch[1].trim();
  }

  const pnrMatch = text.match(
    /(?:rezerwacja|kod\s*rezerwacji|pnr|booking\s*ref)\s*[:.-]?\s*([A-Za-z0-9-]+)/i
  );
  if (pnrMatch) {
    result.bookingReference = pnrMatch[1].trim();
  }

  // Price
  const priceMatch = text.match(/(\d+[.,]\d{2})\s*(?:pln|z[łl]|eur)/i);
  if (priceMatch) {
    result.price = `${priceMatch[1].replace(',', '.')} PLN`;
  }

  // Barcode data fallback
  if (result.ticketNumber || result.trainNumber) {
    result.barcodeData = `TICKET#${result.carrier || 'RAIL'}#${result.trainNumber || ''}#${result.ticketNumber || Date.now()}#${result.passengerName || ''}`;
  }

  return result;
}
