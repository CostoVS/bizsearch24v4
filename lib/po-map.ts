import fs from 'fs';
import path from 'path';

function normalizeKey(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type PoEntry = {
  suburb: string;
  town?: string;
  postal: string;
};

let PO_MAP: Record<string, Set<string>> | null = null;
let PO_BY_TOWN: Record<string, Set<string>> | null = null;

function loadRawFiles() {
  if (PO_MAP) return;
  PO_MAP = {};
  PO_BY_TOWN = {};

  const base = process.cwd();
  const candidates = ['raw_po_part1.txt', 'raw_po_part2.txt', 'raw_po_part3.txt'];

  candidates.forEach((fname) => {
    try {
      const filePath = path.join(base, fname);
      if (!fs.existsSync(filePath)) return;
      const text = fs.readFileSync(filePath, 'utf-8');
      const lines = text.split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        // split on tabs or multiple spaces
        const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean);
        if (!parts.length) continue;

        // find numeric token of length 3-4 as postal
        let postal = '';
        let town = '';
        let suburb = parts[0] || '';

        for (let i = 0; i < parts.length; i++) {
          const t = parts[i];
          if (!postal && /^\d{3,4}$/.test(t)) {
            postal = t;
            // town might be next token
            if (i + 1 < parts.length) town = parts[i + 1];
            break;
          }
        }

        if (!postal) {
          // fallback: look for any 3-4 digit token anywhere
          const match = line.match(/\b(\d{3,4})\b/);
          if (match) postal = match[1];
        }

        if (!suburb && parts.length >= 1) suburb = parts[0];
        suburb = suburb.trim();
        town = town.trim();

        if (!suburb) continue;
        const sKey = normalizeKey(suburb);
        const tKey = normalizeKey(town);
        if (postal) {
          if (!PO_MAP[sKey]) PO_MAP[sKey] = new Set();
          PO_MAP[sKey].add(postal);
          if (tKey) {
            if (!PO_BY_TOWN[tKey]) PO_BY_TOWN[tKey] = new Set();
            PO_BY_TOWN[tKey].add(postal);
          }
        }
      }
    } catch (e) {
      // ignore file read errors
    }
  });
}

export function findPostalCodesFor(suburb?: string, town?: string): string[] {
  loadRawFiles();
  const out = new Set<string>();
  if (!suburb && !town) return [];

  const sKey = normalizeKey(suburb || '');
  const tKey = normalizeKey(town || '');

  if (sKey && PO_MAP && PO_MAP[sKey]) {
    PO_MAP[sKey].forEach(p => out.add(p));
  }

  // Try substring matches on PO_MAP keys
  if (sKey && PO_MAP) {
    for (const key of Object.keys(PO_MAP)) {
      if (key.includes(sKey) || sKey.includes(key)) {
        PO_MAP[key].forEach(p => out.add(p));
      }
    }
  }

  // Fallback to town mapping
  if (tKey && PO_BY_TOWN && PO_BY_TOWN[tKey]) {
    PO_BY_TOWN[tKey].forEach(p => out.add(p));
  }

  // Try town fuzzy match
  if (tKey && PO_BY_TOWN) {
    for (const key of Object.keys(PO_BY_TOWN)) {
      if (key.includes(tKey) || tKey.includes(key)) {
        PO_BY_TOWN[key].forEach(p => out.add(p));
      }
    }
  }

  return Array.from(out).slice(0, 5);
}

export function findPostalCode(suburb?: string, town?: string): string | null {
  const codes = findPostalCodesFor(suburb, town);
  if (!codes || codes.length === 0) return null;
  // prefer 4-digit codes over 3-digit
  const four = codes.find(c => c.length === 4);
  return four || codes[0] || null;
}
