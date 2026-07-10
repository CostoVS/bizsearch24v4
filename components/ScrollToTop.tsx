"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as any });
    }
  }, [pathname]);

  return null;
}
