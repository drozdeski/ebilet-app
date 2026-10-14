# Bilety eTravel — Offline Train Ticket Wallet PWA

A high-performance, 100% network-independent train ticket holder designed for iOS Safari and mobile devices. Built to be hosted effortlessly on GitHub Pages (`https://drozdeski.github.io/bilety-etravel/`), storing all ticket data and ticket PDF/image attachments locally inside IndexedDB with zero cloud dependencies, offline Service Worker precaching, conductor scan view, and single-click JSON backup/restore.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Based on your clarifications, here are the architectural foundations locked in for this project:

- **Application Domain**: Train Ticket Holder (tailored for PKP Intercity, eTravel, Polregio, Koleje Mazowieckie, and European rail journeys).
- **Target Hosting**: **GitHub Pages with free HTTPS** — configured with relative base paths (`base: './'`) and an included GitHub Actions workflow so pushing code to `github.com/drozdeski/bilety-etravel` automatically builds and hosts the app.
- **Persistence & Offline Guarantee**: **IndexedDB Engine** with persistent storage registration (`navigator.storage.persist()`), offline Service Worker via `vite-plugin-pwa` Workbox precaching, and manual JSON backup export/restore.
- **iOS Safari Support**: Dedicated iOS "Add to Home Screen" instructions, Apple touch icons, `standalone` mode, and high-contrast full-screen conductor scan mode (QR/Aztec barcode + PDF view) that works even with Airplane Mode enabled in tunnels or remote rail segments.

---

### 1. Overview & Core Concept

When traveling by train, mobile coverage frequently drops in transit (tunnels, rural rail tracks, cross-border routes). Attempting to open email attachments or carrier apps often results in loading errors right when the conductor arrives.

**Bilety eTravel** solves this by turning your smartphone into an offline ticket vault:
- **Zero Network Required**: Once installed or opened once, the Service Worker serves the entire application and UI from device cache.
- **Local IndexedDB Database**: All ticket details, seats, train numbers, timetables, and raw PDF/image attachments are stored on-device in IndexedDB.
- **Conductor-Ready Fullscreen Mode**: Tap any ticket to open an illuminated display showing the Aztec/QR barcode, carriage/seat numbers, and embedded ticket PDF viewer for rapid conductor inspection.
- **GitHub Pages Ready**: Configured to run on GitHub Pages root or sub-paths without broken asset links.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Wallet / Active Journeys View**:
   - Hero card for the *Next / Current Journey* showing departure countdown, origin & destination, platform, train number (e.g. EIP 1301 Pendolino), carriage (wagon), and seat (miejsce).
   - Filter tabs: **Upcoming**, **Active**, **Past / Archived**.
   - Offline status banner: Discreet indicator confirming all tickets are cached and storage is protected.
2. **Ticket Detail & Conductor View**:
   - Tap any ticket to view comprehensive journey details, timeline stops, passengers, and seat details.
   - **"Pokaż do kontroli" (Show for Inspection) button**: Launches a dedicated high-contrast scan card with 2D barcode (QR / Aztec code), large seat coordinates (`Wagon 4, Miejsce 52 Okno`), and integrated PDF/image preview.
   - Brightness boost toggle and one-tap PDF document download/view.
3. **Add Ticket Wizard**:
   - **Smart Text / Email Parser**: Paste reservation text from eTravel or PKP confirmation emails to automatically extract train code, stations, dates, times, and seats.
   - **Manual Form Input**: Clean, responsive fields with prefilled common Polish rail stations (Warszawa Centralna, Kraków Główny, Gdańsk, Wrocław, Poznań, etc.).
   - **Attachment Upload**: Attach PDF tickets or screenshots directly into IndexedDB.
4. **Data Management & Backup**:
   - **Export JSON**: Download a complete `.json` file containing all ticket metadata and encoded attachments.
   - **Restore JSON**: Drag-and-drop or upload a previous backup to restore everything onto a new iPhone or browser.
   - **Storage Inspector**: View exact storage usage (KB/MB) and verify iOS persistent storage status.
5. **iOS Safari Installation Guide**:
   - In-app install banner with step-by-step visual instructions: `Share` icon $\rightarrow$ `Add to Home Screen`.

#### B. Visual Identity & Theme
- **Aesthetic**: Utilitarian European railway precision meets modern iOS design ergonomics. Clean, high-contrast, designed for rapid legibility in dim train carriages or bright sunlight.
- **Palette**:
  - Dominant Neutral: Crisp slate-white canvas (`#f8fafc`) with deep midnight background in dark mode (`#0f172a`).
  - Railway Indigo / Navy Accent: Professional transport blue (`#1e3a8a` / `#2563eb`) with amber warning accents for pending departures.
  - High Contrast Inspection Card: Pure `#ffffff` card with `#000000` text and barcodes for optimal handheld scanner readability.
- **Typography**: Clean neo-grotesque sans paired with `tabular-nums` for timetable clocks and seat numbers.
- **Zero-Pill Restraint**: Metadata rendered with typographic dividers (`14:25 · Peron 2 · Wagon 5 · Miejsce 43`); no pill badge clutter.

---

### 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Why | Alternatives Considered |
| :--- | :--- | :--- | :--- |
| **Hosting & Base URL** | `base: './'` in Vite | Enables the app to work seamlessly on GitHub Pages at `https://drozdeski.github.io/bilety-etravel/` or any custom domain without 404 script path errors. | Hardcoded absolute paths `/` (breaks when deployed to a GitHub Pages repository subpath). |
| **Data Storage Engine** | IndexedDB (`idb-keyval` / native IndexedDB wrapper) | Supports binary PDF attachments, ticket images, and large amounts of ticket data without the 5MB `localStorage` ceiling. | `localStorage` (strictly limited to ~5MB and cannot hold binary PDFs reliably). |
| **PWA Service Worker** | `vite-plugin-pwa` with Workbox `CacheFirst` | Precaches all JS, CSS, fonts, and HTML so iOS Safari opens the app instantaneously even in Airplane Mode. | Service worker from scratch (error-prone cache busting and update handling). |
| **iOS Storage Eviction Defense** | `navigator.storage.persist()` | Prompts Safari to flag the site's origin as persistent, drastically reducing the risk of iOS purging IndexedDB after 7 days of inactivity. | Relying on default temporary storage (risk of silent data deletion on iOS Safari). |
| **Ticket Barcode Generation** | In-app QR / 2D Barcode renderer (`qrcode.react` / SVG matrix) | Generates scan codes offline on demand from ticket booking URLs, e-ticket tokens, or UIC 918.3 barcodes. | Remote barcode generator APIs (fail completely when offline). |

---

### 4. Technical Architecture & Data Strategy

#### System & Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          iOS Safari / Mobile Screen                         │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │     Top App Bar       │  │ Offline Status &  │  │ iOS Install Banner  │  │
│  │ (Search, Filter, Add) │  │ Persistence Guard │  │ ("Add to Home Scrn")│  │
│  └───────────┬───────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
│              │                        │                       │             │
│  ┌───────────▼────────────────────────▼───────────────────────▼──────────┐  │
│  │                          Wallet Main View                             │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Next Train Countdown Card (Origin, Destination, Wagon, Seat)    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Ticket List (Upcoming, Completed, Archived, Filter by Carrier)   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────┬────────────────────────┬───────────────────────┬──────────┘  │
│              │                        │                       │             │
│  ┌───────────▼───────────┐  ┌─────────▼─────────┐  ┌──────────▼──────────┐  │
│  │   Conductor View      │  │  Add / Import     │  │ Backup & GitHub     │  │
│  │  - Barcode / QR Code  │  │  - Text Parser    │  │  - Export / Restore │  │
│  │  - Seat & Info HUD    │  │  - Manual Form    │  │  - GitHub Pages Doc │  │
│  │  - PDF Viewer Canvas  │  │  - PDF Attachment │  │  - Storage Monitor  │  │
│  └───────────┬───────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
└──────────────┼────────────────────────┼───────────────────────┼─────────────┘
               │                        │                       │              
┌──────────────▼────────────────────────▼───────────────────────▼─────────────┐
│                          IndexedDB Storage Engine                           │
│  - tickets_store: [Ticket Record { id, stations, times, seat, pdfBlob... }]  │
│  - settings_store: [App Settings, Theme, Storage Persist Flag]               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │                                       
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    Service Worker (Workbox / VitePWA)                       │
│  - Precaches index.html, JS bundles, CSS, fonts, SVG/PNG icons               │
│  - CacheFirst strategy for offline instant loading on iOS                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Ticket Data Entity Model
```typescript
interface TrainTicket {
  id: string;               // UUID
  title?: string;           // Optional journey title (e.g. "Wyjazd na konferencję")
  carrier: 'PKP Intercity' | 'Polregio' | 'Koleje Mazowieckie' | 'eTravel' | 'Other';
  trainNumber: string;      // e.g. "EIP 1301", "IC 5310", "TLK 38100"
  trainCategory?: string;   // "Pendolino", "InterCity", "TLK", "Regio"
  
  // Timetable
  departureStation: string; // e.g. "Warszawa Centralna"
  departureTime: string;    // ISO string or "YYYY-MM-DD HH:mm"
  departurePlatform?: string;
  arrivalStation: string;   // e.g. "Kraków Główny"
  arrivalTime: string;      // ISO string or "YYYY-MM-DD HH:mm"
  arrivalPlatform?: string;
  
  // Placement
  carNumber: string;        // Wagon (e.g. "04")
  seatNumber: string;       // Miejsce (e.g. "52")
  travelClass: '1' | '2';   // 1st or 2nd class
  seatType?: 'Okno' | 'Korytarz' | 'Środek' | 'Przedział' | 'Bezprzedziałowy';
  
  // Passenger & Booking
  passengerName: string;
  ticketNumber?: string;    // e.g. "930281928"
  bookingReference?: string;// PNR
  
  // Conductor Inspection
  barcodeData?: string;     // Raw ticket URL, Aztec string, or QR payload
  hasAttachment: boolean;
  attachmentType?: 'pdf' | 'image';
  attachmentName?: string;
  attachmentDataUrl?: string; // Stored in IndexedDB for 100% offline viewing
  
  // Status
  isArchived: boolean;
  createdAt: number;
}
```

#### GitHub Pages Export & Deployment Setup
The plan includes:
1. `vite.config.ts` configured with `base: './'` so that all assets, icons, and worker scripts load relative to the deployed GitHub Pages path.
2. Complete `vite-plugin-pwa` configuration with Web App Manifest, Apple meta tags, and service worker registration.
3. `.github/workflows/deploy.yml` that builds and publishes the PWA to GitHub Pages with standard `actions/deploy-pages`.
4. Dedicated in-app **"GitHub & iOS Guide"** modal/tab explaining:
   - How to push the code to `https://github.com/drozdeski/bilety-etravel`.
   - How to turn on GitHub Pages in repository Settings (`Settings -> Pages -> GitHub Actions`).
   - How to open on iPhone Safari and tap **"Add to Home Screen"**.
   - How to ensure persistent storage is enabled so iOS never purges offline tickets.
