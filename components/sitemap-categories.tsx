"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import {
  CATEGORIES_STRUCTURED,
  getCategoryIcon,
  getCategoryAdsCounts,
  getCountForCategory,
  fetchDirectoryStats,
} from "@/lib/data";

export function SitemapCategories() {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const syncLocal = () => {
      setCategoryCounts(getCategoryAdsCounts());
    };

    const fetchLive = async (force: boolean = false) => {
      try {
        const data = await fetchDirectoryStats(force);
        if (data?.adminStats?.byCategory) {
          setCategoryCounts(data.adminStats.byCategory);
        }
      } catch (e) {}
    };

    syncLocal();
    fetchLive(false);

    const handleAdsUpdated = () => {
      syncLocal();
      fetchLive(true);
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "searchbiz_category_counts" ||
        e.key === "searchbiz_total_ads_count" ||
        e.key === "searchbiz_all_ads" ||
        e.key === "searchbiz_deleted_ads"
      ) {
        syncLocal();
      }
    };

    window.addEventListener("searchbiz_ads_updated", handleAdsUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", handleAdsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200 sticky top-28 block shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>20 Industry Sectors</span>
        </h2>
        <Link
          prefetch={false}
          href="/categories"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline shrink-0"
        >
          Full Index →
        </Link>
      </div>
      <div className="flex flex-col space-y-2.5 max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
        {CATEGORIES_STRUCTURED.map((group) => {
          const count = getCountForCategory(categoryCounts, group.name);
          const icon = getCategoryIcon(group.cleanName);
          return (
            <Link
              prefetch={false}
              key={group.id}
              href={`/directory?category=${encodeURIComponent(group.name)}`}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200/90 hover:border-emerald-300 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base shrink-0">{icon}</span>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors leading-snug break-words">
                  {group.name}
                </span>
              </div>
              <span
                className={`font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-xl shrink-0 border ${
                  count > 0
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {count.toLocaleString()} Ads
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
