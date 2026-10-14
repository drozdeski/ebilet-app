export type RailCarrier =
  | 'PKP Intercity'
  | 'Polregio'
  | 'Koleje Mazowieckie'
  | 'eTravel'
  | 'Koleje Dolnośląskie'
  | 'Koleje Śląskie'
  | 'Deutsche Bahn'
  | 'Inny';

export interface TrainTicket {
  id: string;
  title?: string;
  carrier: RailCarrier;
  trainNumber: string; // e.g. "EIP 1301", "IC 5310"
  trainName?: string; // e.g. "Pendolino", "Kochanowski"

  // Timetable
  departureStation: string; // e.g. "Warszawa Centralna"
  departureTime: string; // "YYYY-MM-DDTHH:mm"
  departurePlatform?: string;
  arrivalStation: string; // e.g. "Kraków Główny"
  arrivalTime: string; // "YYYY-MM-DDTHH:mm"
  arrivalPlatform?: string;

  // Placement
  carNumber: string; // Wagon (e.g. "04")
  seatNumber: string; // Miejsce (e.g. "52")
  travelClass: '1' | '2';
  seatType?: 'Okno' | 'Korytarz' | 'Środek' | 'Przedział' | 'Bezprzedziałowy';

  // Passenger & Document
  passengerName: string;
  ticketNumber?: string; // Bilet nr
  bookingReference?: string; // Kod rezerwacji (PNR)
  price?: string; // e.g. "169.00 PLN"

  // Conductor Inspection
  barcodeData: string; // QR / Aztec barcode payload or verification link
  barcodeImageUrl?: string; // Cropped high-resolution original Aztec / QR code image from PDF
  emergencyCode?: string; // Kod awaryjny (np. 6079)
  hasAttachment: boolean;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image';
  attachmentDataUrl?: string; // Base64 Data URL stored in IndexedDB for 100% offline access
  pdfPagePreviewUrl?: string; // High-res image rendering of the original ticket page for instant offline display

  // State
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StorageStats {
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  ticketCount: number;
}
