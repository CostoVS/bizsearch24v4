"use client";
import { useEffect } from 'react';
import { safeLocalStorage, cleanAdsArray, saveCategoryAdsCounts } from '@/lib/data';

export function DataSyncer() {
  useEffect(() => {
    let isSyncing = false;

    const performSync = async () => {
      if (document.hidden || isSyncing) return;
      isSyncing = true;
      try {
        // Lightweight O(1) background sync
        const res = await fetch('/api/storage?syncOnly=true', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const totalCnt = data.globalTotalAdsCount ?? data.totalAdsCount;
            const verCnt = data.globalVerifiedCount ?? data.verifiedCount;
            const prevTotal = safeLocalStorage.getItem("searchbiz_total_ads_count");
            const prevVer = safeLocalStorage.getItem("searchbiz_verified_count");
            let adsChanged = false;

            if (totalCnt !== undefined && String(totalCnt) !== prevTotal) {
              safeLocalStorage.setItem("searchbiz_total_ads_count", String(totalCnt));
              adsChanged = true;
            }
            if (verCnt !== undefined && String(verCnt) !== prevVer) {
              safeLocalStorage.setItem("searchbiz_verified_count", String(verCnt));
              adsChanged = true;
            }
            if (data.adminStats?.byCategory) {
              saveCategoryAdsCounts(data.adminStats.byCategory);
            }

            // 1. Ads sync (always clear if server has 0 ads, or write to localStorage if empty or counts changed)
            if (Array.isArray(data.ads)) {
              const existingLocalAds = safeLocalStorage.getItem("searchbiz_all_ads");
              if (totalCnt === 0 || data.ads.length === 0) {
                if (existingLocalAds !== "[]") {
                  safeLocalStorage.setItem("searchbiz_all_ads", "[]");
                  safeLocalStorage.setItem("searchbiz_custom_ads", "[]");
                  safeLocalStorage.setItem("searchbiz_category_counts", "{}");
                  adsChanged = true;
                }
              } else if (!existingLocalAds || existingLocalAds === "[]" || adsChanged) {
                const serverAds = data.ads.filter((a: any) => a && a.id);
                const storedDeleted = safeLocalStorage.getItem("searchbiz_deleted_ads");
                let localDeleted: string[] = [];
                if (storedDeleted) { try { localDeleted = JSON.parse(storedDeleted); } catch (e) {} }

                const combinedDeletedSet = new Set(localDeleted);
                const cleanedServerAds = cleanAdsArray(serverAds);
                const finalAds = cleanedServerAds.filter((a: any) => a && a.id && !combinedDeletedSet.has(a.id));

                safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(finalAds.slice(0, 48)));
                adsChanged = true;
              }

              if (data.customPartners) {
                const nextPartners = JSON.stringify(data.customPartners);
                if (safeLocalStorage.getItem("searchbiz_custom_partners") !== nextPartners) {
                  safeLocalStorage.setItem("searchbiz_custom_partners", nextPartners);
                }
              }
              if (adsChanged) {
                window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));
              }
            }

            // 2. Community posts sync
            const serverPosts = Array.isArray(data.community_posts) ? data.community_posts : [];
            const storedPostsStr = safeLocalStorage.getItem("searchbiz_community_posts_v1");
            let localPosts: any[] = [];
            if (storedPostsStr) { try { localPosts = JSON.parse(storedPostsStr); } catch (e) {} }

            const serverPostIds = new Set(serverPosts.map((p: any) => p.id));
            const localOnlyPosts = localPosts.filter((p: any) => p && p.id && !serverPostIds.has(p.id));

            if (localOnlyPosts.length > 0) {
              const mergedPosts = [...localOnlyPosts, ...serverPosts].sort((a, b) => b.id - a.id);
              const nextPostsStr = JSON.stringify(mergedPosts);
              if (nextPostsStr !== storedPostsStr) {
                safeLocalStorage.setItem("searchbiz_community_posts_v1", nextPostsStr);
                window.dispatchEvent(new CustomEvent("searchbiz_posts_updated"));
              }
              fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ community_posts: mergedPosts })
              }).catch(() => null);
            } else {
              const nextPostsStr = JSON.stringify(serverPosts);
              if (nextPostsStr !== storedPostsStr) {
                safeLocalStorage.setItem("searchbiz_community_posts_v1", nextPostsStr);
                window.dispatchEvent(new CustomEvent("searchbiz_posts_updated"));
              }
            }

            // 3. Messages sync
            const serverMsgs = Array.isArray(data.messages) ? data.messages : [];
            const deletedMsgs = new Set(Array.isArray(data.deletedMessages) ? data.deletedMessages : []);
            const storedMsgsStr = safeLocalStorage.getItem("searchbiz_messages_v1");
            let localMsgs: any[] = [];
            if (storedMsgsStr) { try { localMsgs = JSON.parse(storedMsgsStr); } catch (e) {} }

            const activeLocalMsgs = localMsgs.filter((m: any) => m && m.id && !deletedMsgs.has(m.id));
            const serverMsgIds = new Set(serverMsgs.map((m: any) => m.id));
            const localOnlyMsgs = activeLocalMsgs.filter((m: any) => m && m.id && !serverMsgIds.has(m.id));

            const mergedMap = new Map();
            serverMsgs.forEach((m: any) => m && m.id && mergedMap.set(m.id, m));
            activeLocalMsgs.forEach((m: any) => {
              if (m && m.id && !mergedMap.has(m.id)) {
                mergedMap.set(m.id, m);
              }
            });

            activeLocalMsgs.forEach((m: any) => {
              if (m && m.id && mergedMap.has(m.id)) {
                const matched = mergedMap.get(m.id);
                if (m.read && !matched.read) {
                  mergedMap.set(m.id, { ...matched, read: true });
                }
              }
            });

            const finalMsgs = Array.from(mergedMap.values());
            const nextMsgsStr = JSON.stringify(finalMsgs);
            if (nextMsgsStr !== storedMsgsStr) {
              safeLocalStorage.setItem("searchbiz_messages_v1", nextMsgsStr);
              window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
            }

            const serverHasDifferentReadState = serverMsgs.some((sm: any) => {
              const fm = mergedMap.get(sm.id);
              return fm && fm.read && !sm.read;
            });

            if (localOnlyMsgs.length > 0 || serverHasDifferentReadState) {
              fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: finalMsgs })
              }).catch(() => null);
            }
          }
        }
      } catch (e) {
        // Quiet failure on sync
      } finally {
        isSyncing = false;
      }
    };

    // Delay first background sync so initial page render and interactions have 100% network priority
    const initialTimer = setTimeout(performSync, 2500);
    const syncInterval = setInterval(performSync, 45000); // 45s background sync

    const handleVisibilityChange = () => {
      if (!document.hidden) performSync();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(syncInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

