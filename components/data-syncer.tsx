"use client";
import { useEffect } from 'react';
import { getStoredAds, safeLocalStorage, fetchAndStoreAds } from '@/lib/data';

export function DataSyncer() {
  useEffect(() => {
    // Basic sync loop running on app boot
    const runAdsSync = async () => {
      await fetchAndStoreAds();
    };

    runAdsSync();
    const adsInterval = setInterval(runAdsSync, 10000);

    // Community Posts synchronizer
    const syncCommunityPosts = () => {
      const storedStr = safeLocalStorage.getItem("searchbiz_community_posts_v1");
      let localPosts: any[] = [];
      if (storedStr) { try { localPosts = JSON.parse(storedStr); } catch (e) {} }

      fetch('/api/storage', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const serverPosts = Array.isArray(data.community_posts) ? data.community_posts : [];
          
          // Smart merge: prevent local-only posts from being lost, and handle server deletions/updates
          const serverIds = new Set(serverPosts.map((p: any) => p.id));
          const localOnly = localPosts.filter((p: any) => p && p.id && !serverIds.has(p.id));
          
          if (localOnly.length > 0) {
            const merged = [...localOnly, ...serverPosts].sort((a, b) => b.id - a.id);
            safeLocalStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(merged));
            // Sync up
            fetch('/api/storage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ community_posts: merged })
            }).catch(() => null);
          } else {
            safeLocalStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(serverPosts));
          }
          window.dispatchEvent(new CustomEvent("searchbiz_posts_updated"));
        }).catch(() => null);
    };
    syncCommunityPosts();
    const postsInterval = setInterval(syncCommunityPosts, 15000);

    // Message synchronizer
    const syncMessages = () => {
      const storedStr = safeLocalStorage.getItem("searchbiz_messages_v1");
      let localMsgs: any[] = [];
      if (storedStr) { try { localMsgs = JSON.parse(storedStr); } catch (e) {} }

      fetch('/api/storage', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const serverMsgs = Array.isArray(data.messages) ? data.messages : [];
          const deletedMsgs = new Set(Array.isArray(data.deletedMessages) ? data.deletedMessages : []);

          // Filter out locally stored messages that have been deleted on server
          const activeLocalMsgs = localMsgs.filter((m: any) => m && m.id && !deletedMsgs.has(m.id));

          // Check for any messages that are present locally but missing from server
          const serverIds = new Set(serverMsgs.map((m: any) => m.id));
          const localOnly = activeLocalMsgs.filter((m: any) => m && m.id && !serverIds.has(m.id));

          // Reconcile and merge (Server data has precedence but local-only messages are integrated)
          const mergedMap = new Map();
          serverMsgs.forEach((m: any) => m && m.id && mergedMap.set(m.id, m));
          activeLocalMsgs.forEach((m: any) => {
            if (m && m.id && !mergedMap.has(m.id)) {
              mergedMap.set(m.id, m);
            }
          });

          // Check if any read status differs (marked read locally but not on server)
          activeLocalMsgs.forEach((m: any) => {
            if (m && m.id && mergedMap.has(m.id)) {
              const matched = mergedMap.get(m.id);
              if (m.read && !matched.read) {
                mergedMap.set(m.id, { ...matched, read: true });
              }
            }
          });

          const final = Array.from(mergedMap.values());
          safeLocalStorage.setItem("searchbiz_messages_v1", JSON.stringify(final));
          window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

          // If there are newly composed local-only messages, upload them to central cloud DB immediately
          const serverHasDifferentReadState = serverMsgs.some((sm: any) => {
            const fm = mergedMap.get(sm.id);
            return fm && fm.read && !sm.read;
          });

          if (localOnly.length > 0 || serverHasDifferentReadState) {
            fetch('/api/storage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: final })
            }).catch(() => null);
          }
        }).catch(() => null);
    };
    syncMessages();
    const messageInterval = setInterval(syncMessages, 7000);

    return () => {
      clearInterval(adsInterval);
      clearInterval(postsInterval);
      clearInterval(messageInterval);
    };
  }, []);



  return null;
}

