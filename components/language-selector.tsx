"use client";

import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "af", name: "Afrikaans" },
  { code: "zu", name: "isiZulu" },
  { code: "xh", name: "isiXhosa" },
  { code: "st", name: "Sesotho" },
  { code: "nso", name: "Sepedi" },
  { code: "tn", name: "Setswana" },
  { code: "ts", name: "Xitsonga" },
  { code: "ve", name: "Tshivenda" },
  { code: "nr", name: "isiNdebele" },
  { code: "ss", name: "siSwati" },
];

export function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState("en");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Read the googtrans cookie to determine the current language
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return undefined;
    };

    const googtrans = getCookie("googtrans");
    if (googtrans) {
      const match = googtrans.match(/\/en\/([a-z]+)/);
      if (match && match[1]) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentLang(match[1]);
      }
    } else {
      // Auto-detect from device settings
      const userLangs = navigator.languages || [navigator.language];
      for (const lang of userLangs) {
        const baseLang = lang.split("-")[0].toLowerCase();
        const supported = SUPPORTED_LANGUAGES.find((l) => l.code === baseLang);
        if (supported && baseLang !== "en") {
          // Found a supported language preference that isn't English, automatically set it
          const setCookie = (value: string) => {
            window.document.cookie = value;
          };
          setCookie(`googtrans=/en/${baseLang}; path=/;`);
          setCookie(
            `googtrans=/en/${baseLang}; domain=${window.location.hostname}; path=/;`,
          );
          window.location.reload();
          break;
        }
      }
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);

    // Set google translate cookie for entire site
    const setCookie = (value: string) => {
      if (typeof window !== "undefined") {
        window.document.cookie = value;
      }
    };

    if (langCode === "en") {
      setCookie("googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;");
      setCookie(
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" +
          window.location.hostname +
          "; path=/;",
      );
      setCookie(
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=." +
          window.location.hostname +
          "; path=/;",
      );
    } else {
      setCookie(`googtrans=/en/${langCode}; path=/;`);
      setCookie(
        `googtrans=/en/${langCode}; domain=${window.location.hostname}; path=/;`,
      );
      setCookie(
        `googtrans=/en/${langCode}; domain=.${window.location.hostname}; path=/;`,
      );
    }

    window.location.reload(); // Reload to let Google Translate script pick up the new cookie
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition"
      >
        <Globe className="w-4 h-4" />
        <span className="text-[11px] font-bold font-sans uppercase">
          {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.name ||
            "Language"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-slate-100 py-2 w-48 z-50 overflow-hidden">
          <div className="px-3 pb-2 mb-1 border-b border-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">
              Select Language
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-2.5 text-sm transition font-medium border-l-2 ${
                  currentLang === lang.code
                    ? "bg-indigo-50/50 text-indigo-700 border-indigo-600 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
