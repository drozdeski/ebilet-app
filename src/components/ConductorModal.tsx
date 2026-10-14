import React, {useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {
  X,
  Sun,
  FileText,
  User,
  Train,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {TrainTicket} from '../types/ticket';

interface ConductorModalProps {
  ticket: TrainTicket | null;
  onClose: () => void;
}

export const ConductorModal: React.FC<ConductorModalProps> = ({
  ticket,
  onClose,
}) => {
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);

  if (!ticket) return null;

  // Format dates
  const depDate = new Date(ticket.departureTime);
  const arrDate = new Date(ticket.arrivalTime);

  const formattedDepTime = depDate.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedArrTime = arrDate.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = depDate.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe ${
        maxBrightness
          ? 'bg-white'
          : 'bg-slate-950/85 backdrop-blur-md'
      }`}
    >
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl transition-colors duration-200 ${
          maxBrightness
            ? 'bg-white text-black border-2 border-black'
            : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Kontrola biletowa (Tryb Offline)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMaxBrightness(!maxBrightness)}
              title="Maksymalny kontrast dla skanera konduktora"
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                maxBrightness
                  ? 'bg-black text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">
                {maxBrightness ? 'Standard' : 'Kontrast max'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Seat & Coach Banner */}
        <div className="bg-slate-900 text-white p-5 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-blue-300 font-semibold tracking-wider uppercase mb-1">
            <Train className="w-3.5 h-3.5" />
            {ticket.carrier} · {ticket.trainNumber} {ticket.trainName ? `"${ticket.trainName}"` : ''}
          </div>

          <div className="grid grid-cols-2 gap-3 my-2 max-w-xs mx-auto">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-medium block">
                Wagon
              </span>
              <span className="text-3xl font-extrabold font-mono tracking-tight text-amber-400">
                {ticket.carNumber}
              </span>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-medium block">
                Miejsce
              </span>
              <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                {ticket.seatNumber}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 mt-2 font-medium">
            Klasa {ticket.travelClass} · {ticket.seatType || 'Miejsce siedzące'}
          </div>
        </div>

        {/* Aztec / QR Barcode Container (High-Contrast White Area) */}
        <div className="p-6 bg-white flex flex-col items-center justify-center border-b border-dashed border-slate-200">
          <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-inner flex flex-col items-center">
            {ticket.barcodeImageUrl ? (
              <img
                src={ticket.barcodeImageUrl}
                alt="Oryginalny kod Aztec z biletu PDF"
                className="w-56 h-auto object-contain image-rendering-pixelated"
              />
            ) : (
              <QRCodeSVG
                value={ticket.barcodeData || `TICKET-${ticket.id}`}
                size={210}
                level="M"
                includeMargin={false}
              />
            )}
          </div>

          <div className="mt-3 text-center space-y-1">
            <p className="text-xs font-mono text-slate-500 tracking-tight">
              Bilet:{' '}
              <strong className="text-slate-900 font-bold">
                {ticket.ticketNumber || ticket.bookingReference || ticket.id.slice(0, 8)}
              </strong>
            </p>
            {ticket.emergencyCode && (
              <p className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block font-semibold">
                Kod awaryjny: {ticket.emergencyCode}
              </p>
            )}
          </div>
        </div>

        {/* Passenger & Journey Details */}
        <div className="p-5 space-y-4 text-sm bg-slate-50/50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs">Podróżny:</span>
            </div>
            <span className="font-semibold text-slate-900 text-right">
              {ticket.passengerName || 'Nieokreślony'}
            </span>
          </div>

          {/* Route & Times */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Stacja początkowa
                </div>
                <div className="font-bold text-slate-900 text-base">
                  {ticket.departureStation}
                </div>
                {ticket.departurePlatform && (
                  <div className="text-xs text-slate-500">
                    {ticket.departurePlatform}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Odjazd
                </div>
                <div className="font-bold font-mono text-slate-900 text-lg">
                  {formattedDepTime}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Stacja docelowa
                </div>
                <div className="font-bold text-slate-900 text-base">
                  {ticket.arrivalStation}
                </div>
                {ticket.arrivalPlatform && (
                  <div className="text-xs text-slate-500">
                    {ticket.arrivalPlatform}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Przyjazd
                </div>
                <div className="font-bold font-mono text-slate-900 text-lg">
                  {formattedArrTime}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 text-center pt-2">
              Data podróży: <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>
          </div>

          {/* Attached Document Section (Offline PDF or Screenshot) */}
          {(ticket.hasAttachment || ticket.pdfPagePreviewUrl) && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowAttachment(!showAttachment)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>
                    {ticket.attachmentName || 'Oryginalny bilet eTravel (Podgląd PDF)'}
                  </span>
                </div>
                {showAttachment ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAttachment && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                  {ticket.pdfPagePreviewUrl ? (
                    <img
                      src={ticket.pdfPagePreviewUrl}
                      alt="Oryginalna strona biletu"
                      className="w-full h-auto rounded-lg shadow-sm border border-slate-200"
                    />
                  ) : ticket.attachmentType === 'image' ||
                    (ticket.attachmentDataUrl && ticket.attachmentDataUrl.startsWith('data:image')) ? (
                    <img
                      src={ticket.attachmentDataUrl}
                      alt="Załączony bilet"
                      className="max-h-96 w-auto mx-auto rounded-lg shadow-sm"
                    />
                  ) : ticket.attachmentDataUrl ? (
                    <iframe
                      src={ticket.attachmentDataUrl}
                      title="Podgląd PDF"
                      className="w-full h-80 rounded-lg border border-slate-200"
                    />
                  ) : null}

                  {ticket.attachmentDataUrl && (
                    <a
                      href={ticket.attachmentDataUrl}
                      download={ticket.attachmentName || `bilet-${ticket.trainNumber}.pdf`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pobierz / Zapisz plik PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Zamknij widok kontroli
          </button>
        </div>
      </div>
    </div>
  );
};
