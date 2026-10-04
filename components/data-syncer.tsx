"use client";
import { useEffect } from 'react';
import { safeLocalStorage, cleanAdsArray } from '@/lib/data';

export function DataSyncer() {
  useEffect(() => {
    let isSyncing = false;

    const performSync = async () => {
      if (document.hidden || isSyncing) return;
      isSyncing = true;
      try {
        // Single unified storage fetch (lightweight slice for fast background sync)
        const res = await fetch('/api/storage?page=1&pageSize=48', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const totalCnt = data.globalTotalAdsCount ?? data.totalAdsCount;
            const verCnt = data.globalVerifiedCount ?? data.verifiedCount;
            if (totalCnt !== undefined) {
              safeLocalStorage.setItem("searchbiz_total_ads_count", String(totalCnt));
            }
            if (verCnt !== undefined) {
              safeLocalStorage.setItem("searchbiz_verified_count", String(verCnt));
            }

            // 1. Ads sync
            if (Array.isArray(data.ads)) {
              const serverAds = data.ads.filter((a: any) => a && a.id);
              const serverDeleted = Array.isArray(data.deletedAds) ? data.deletedAds : [];
              const storedDeleted = safeLocalStorage.getItem("searchbiz_deleted_ads");
              let localDeleted: string[] = [];
              if (storedDeleted) { try { localDeleted = JSON.parse(storedDeleted); } catch (e) {} }

              const combinedDeletedSet = new Set([...serverDeleted, ...localDeleted]);
              const cleanedServerAds = cleanAdsArray(serverAds);
              const finalAds = cleanedServerAds.filter((a: any) => a && a.id && !combinedDeletedSet.has(a.id));

              safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(finalAds.slice(0, 100)));
              safeLocalStorage.setItem("searchbiz_deleted_ads", JSON.stringify(Array.from(combinedDeletedSet)));

              if (data.customPartners) {
                safeLocalStorage.setItem("searchbiz_custom_partners", JSON.stringify(data.customPartners));
              }
              if (Array.isArray(data.trashAds)) {
                safeLocalStorage.setItem("searchbiz_trash_ads", JSON.stringify(data.trashAds));
              }
              window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));
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
              safeLocalStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(mergedPosts));
              fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ community_posts: mergedPosts })
              }).catch(() => null);
            } else {
              safeLocalStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(serverPosts));
            }
            window.dispatchEvent(new CustomEvent("searchbiz_posts_updated"));

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
            safeLocalStorage.setItem("searchbiz_messages_v1", JSON.stringify(finalMsgs));
            window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

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

    // Delay first background sync slightly so initial page render paints instantly
    const initialTimer = setTimeout(performSync, 400);
    const syncInterval = setInterval(performSync, 30000); // 30s background sync

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

