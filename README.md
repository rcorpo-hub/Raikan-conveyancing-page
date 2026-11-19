# Raikan Conveyancing – Official Website

The official, conversion-focused web application for **Raikan Corporation Conveyancing**, serving Adelaide and all of South Australia. Built with modern React, TypeScript, Vite, and Tailwind CSS.

---

## 🚀 How to Run Manually

Follow these simple steps to run the website locally on your computer:

### 1. Prerequisites

Ensure you have **Node.js** (version 18 or higher) installed on your system.

- Check Node version:
  ```bash
  node -v
  ```
- Check npm version:
  ```bash
  npm -v
  ```

*(If Node.js is not installed, download and install the LTS version from [nodejs.org](https://nodejs.org/).)*

---

### 2. Navigate to the Project Folder

Open your terminal (PowerShell, Command Prompt, or Terminal) and change into the project root directory:

```bash
cd path/to/Raiken_Website_V1
```

---

### 3. Install Dependencies

Install all required packages from `package.json`:

```bash
npm install
```

---

### 4. Start the Local Development Server

Launch the Vite development server:

```bash
npm run dev
```

Once the server starts, you will see output similar to:

```
  VITE v6.4.6  ready in 628 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 5. View in Your Browser

Open your web browser (Chrome, Edge, Safari, Firefox) and navigate to:

```
http://localhost:5173/
```

*(Note: If port `5173` is already in use by another app, Vite will automatically serve on `http://localhost:5174/` as indicated in the terminal).*

---

## 🛠️ Additional Commands

### Build for Production

To typecheck with TypeScript and create an optimized, minified production build:

```bash
npm run build
```

The compiled, production-ready static files will be generated in the `dist/` folder.

### Preview Production Build

To preview the production build locally before deployment:

```bash
npm run preview
```

### TypeScript Validation

To run the TypeScript type checker without building:

```bash
npx tsc --noEmit
```

---

## 📁 Project Structure

```
Raiken_Website_V1/
├── public/
│   └── assets/                  # Official corporate logo, PDFs, and visuals
├── src/
│   ├── components/
│   │   ├── chatbot/             # Raikan AI guide & South Australian knowledge engine
│   │   │   ├── knowledgeEngine.ts
│   │   │   ├── MessageContent.tsx
│   │   │   └── RaikanChatbot.tsx
│   │   ├── common/              # Shared modals & policy dialogs
│   │   │   ├── PolicyDialog.tsx
│   │   │   └── VoiModal.tsx
│   │   ├── home/                # Homepage core components
│   │   │   ├── HomeFinalCta.tsx
│   │   │   ├── HomeHero.tsx
│   │   │   ├── HomeStepVideoShowcase.tsx
│   │   │   └── HomeWhatWeDo.tsx
│   │   └── layout/              # Navigation & footer
│   │       ├── Footer.tsx
│   │       └── Navbar.tsx
│   ├── data/
│   │   └── site.config.ts       # Central business configuration (phone, email, fees)
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces and service types
│   ├── App.tsx                  # Main application structure
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Tailwind CSS & custom design tokens
│   └── vite-env.d.ts            # Vite client types
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies & scripts
├── tailwind.config.js           # Brand colors & styling configuration
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## ⚖️ Key Features & Capabilities

- **Fixed-Fee Clarity:** Transparent fee presentation starting from **$600 + GST** ($660 incl. GST) with zero hidden markups.
- **Interactive Fee Estimator:** Built directly into the hero section with no required contact information to see starting fees.
- **Conveyancing Process Showcase:** 4-step interactive video/slide carousel explaining the conveyancing process from contract review to PEXA settlement.
- **Raikan AI Assistant:** Accessible floating guide answering questions regarding South Australian conveyancing law:
  - 2-day statutory cooling-off under SA *Land and Business Act 1994*.
  - Form 1 statutory disclosure statement requirements.
  - Electronic settlement through PEXA.
  - RevenueSA Stamp Duty relief & first home buyer concessions.
- **ARNECC VOI Checklist:** Built-in guidance for Verification of Identity compliance.
- **Accessible & Responsive:** Compliant with keyboard navigation, ARIA semantics, and optimized across mobile, tablet, and desktop screens.

---

## 📞 Business & Contact Information

- **Company:** Raikan Corporation Conveyancing
- **Head Office:** Broadview, Adelaide, South Australia 5083
- **Phone:** `08 7076 9899`
- **Email:** `info@rcorpo.com`
- **Hours:** Monday – Friday, 9:00 am – 5:00 pm ACST
