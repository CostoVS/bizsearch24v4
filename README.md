# SearchBiz.co.za (v4.2.0)

South Africa's premier smart business directory, lead engine, and multi-province ingestion platform.

## Features & Build Notes

- **CSV Business Ingestion & Auto-Sorting:**
  - 🌍 **All Provinces Auto-Sort:** Scanned leads and directory rows are dynamically classified into all 9 South African provinces (Gauteng, KwaZulu-Natal, Western Cape, Eastern Cape, Free State, Limpopo, Mpumalanga, North West, Northern Cape) using postal codes, telephone/cell area prefixes, suburbs, and street addresses.
  - 📂 **Target Category Override & Auto-Detect:** Choose any primary business category or allow automatic classification per row.
  - ⚡ **Non-Blocking Streaming:** Large datasets are processed in yield-buffered batches with live percentage progress, preventing browser lock-ups or timeouts.

- **Lite Performance & Zero Lag:**
  - Sub-millisecond in-memory RAM index with O(1) lookups.
  - Mobile-optimized pagination capped at lightweight chunks (48–96 ads) to ensure instant loading on all mobile and desktop browsers.
  - Zero 504/502 gateway timeouts with async disk sync and background pre-warming.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
