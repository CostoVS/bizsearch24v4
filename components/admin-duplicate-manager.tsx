"use client";

import React, { useState, useMemo } from "react";
import { 
  Copy, 
  Trash2, 
  Edit, 
  Eye, 
  Search, 
  Filter, 
  Sparkles, 
  Plus, 
  GitMerge, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink, 
  Layers, 
  ArrowRight, 
  Check, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Database,
  Building2,
  Share2,
  RefreshCw
} from "lucide-react";
import { SA_PROVINCES, findSuburbAndTown } from "@/lib/locations";
import { CATEGORIES, CATEGORIES_STRUCTURED } from "@/lib/categories";
import { cleanAd, cleanAdsArray } from "@/lib/clean-ad";
import { saveStoredAds, deleteAd } from "@/lib/data";

interface AdminDuplicateManagerProps {
  ads: any[];
  onUpdateAds: (updated: any[]) => void;
  onViewAd: (ad: any) => void;
  users?: any[];
}

export interface DuplicateCluster {
  id: string;
  primaryTitle: string;
  matchReasons: string[];
  ads: any[];
  hasCsv: boolean;
  hasUser: boolean;
  hasVerified: boolean;
  maxTier: string;
}

// Normalization utilities
function normalizeTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/\b(pty|ltd|proprietary|limited|cc|inc|incorporated|pvt|co|company|holdings|services|group)\b/gi, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length >= 10) {
    return "0" + digits.substring(2);
  }
  if (digits.length >= 7) {
    return digits.slice(-9); // match last 9 digits for SA phones
  }
  return "";
}

function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.toLowerCase().trim();
}

function normalizeAddress(addr: string): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .replace(/\b(st|street|rd|road|ave|avenue|dr|drive|cnr|corner|cl|close|way|pl|place|blvd)\b/gi, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWebsite(url: string): string {
  if (!url) return "";
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

export default function AdminDuplicateManager({
  ads,
  onUpdateAds,
  onViewAd,
  users = []
}: AdminDuplicateManagerProps) {
  // Navigation / sub-views
  const [viewMode, setViewMode] = useState<"duplicates" | "multi_creator" | "all_ads">("duplicates");
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [matchFilter, setMatchFilter] = useState<"all" | "name" | "phone" | "email" | "address">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "mixed" | "csv_only" | "user_only">("all");
  const [sortBy, setSortBy] = useState<"count_desc" | "title_asc" | "newest">("count_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Selection state for batch actions
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [expandedClusterIds, setExpandedClusterIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [cloningAd, setCloningAd] = useState<any | null>(null);
  const [mergingCluster, setMergingCluster] = useState<DuplicateCluster | null>(null);
  const [masterAdIdForMerge, setMasterAdIdForMerge] = useState<string>("");
  const [isCreatingNewAd, setIsCreatingNewAd] = useState(false);

  // New Ad Form State
  const [newAdForm, setNewAdForm] = useState({
    title: "",
    category: "Other",
    province: "gauteng",
    city: "Johannesburg",
    suburb: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    servicesOffered: "",
    description: "",
    tier: "FREE",
    verified: false
  });

  // Batch Generation Form State
  const [batchRawText, setBatchRawText] = useState("");
  const [batchProvince, setBatchProvince] = useState("gauteng");
  const [batchCategory, setBatchCategory] = useState("Other");

  // Clone Form State
  const [cloneForm, setCloneForm] = useState({
    title: "",
    province: "gauteng",
    city: "Johannesburg",
    suburb: "",
    phone: "",
    category: "Other"
  });

  // DUPLICATE DETECTION ALGORITHM
  const duplicateClusters: DuplicateCluster[] = useMemo(() => {
    if (!ads || ads.length === 0) return [];

    const clustersMap: Record<string, {
      primaryTitle: string;
      matchReasons: Set<string>;
      adsMap: Map<string, any>;
    }> = {};

    // Grouping index maps
    const nameGroups: Record<string, string[]> = {};
    const phoneGroups: Record<string, string[]> = {};
    const emailGroups: Record<string, string[]> = {};
    const addressGroups: Record<string, string[]> = {};
    const websiteGroups: Record<string, string[]> = {};

    ads.forEach(ad => {
      if (!ad || !ad.id) return;

      const normName = normalizeTitle(ad.title || "");
      const normPh = normalizePhone(ad.phone || "");
      const normEm = normalizeEmail(ad.email || "");
      const normAddr = normalizeAddress(ad.address || "");
      const normWeb = normalizeWebsite(ad.website || "");

      if (normName && normName.length >= 3) {
        if (!nameGroups[normName]) nameGroups[normName] = [];
        nameGroups[normName].push(ad.id);
      }

      if (normPh && normPh.length >= 7) {
        if (!phoneGroups[normPh]) phoneGroups[normPh] = [];
        phoneGroups[normPh].push(ad.id);
      }

      if (normEm && normEm.includes("@")) {
        if (!emailGroups[normEm]) emailGroups[normEm] = [];
        emailGroups[normEm].push(ad.id);
      }

      if (normAddr && normAddr.length >= 10) {
        if (!addressGroups[normAddr]) addressGroups[normAddr] = [];
        addressGroups[normAddr].push(ad.id);
      }

      if (normWeb && normWeb.length >= 4) {
        if (!websiteGroups[normWeb]) websiteGroups[normWeb] = [];
        websiteGroups[normWeb].push(ad.id);
      }
    });

    const adLookup = new Map<string, any>();
    ads.forEach(a => { if (a && a.id) adLookup.set(a.id, a); });

    // Build disjoint set or union of matching IDs
    const parent: Record<string, string> = {};
    const findRoot = (i: string): string => {
      if (!parent[i]) parent[i] = i;
      if (parent[i] === i) return i;
      parent[i] = findRoot(parent[i]);
      return parent[i];
    };

    const unionRoots = (a: string, b: string) => {
      const rootA = findRoot(a);
      const rootB = findRoot(b);
      if (rootA !== rootB) {
        parent[rootB] = rootA;
      }
    };

    const matchReasonTracker: Record<string, Set<string>> = {};
    const trackReason = (id1: string, id2: string, reason: string) => {
      if (!matchReasonTracker[id1]) matchReasonTracker[id1] = new Set();
      if (!matchReasonTracker[id2]) matchReasonTracker[id2] = new Set();
      matchReasonTracker[id1].add(reason);
      matchReasonTracker[id2].add(reason);
    };

    // Process Name groups
    Object.entries(nameGroups).forEach(([_, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          unionRoots(ids[0], ids[i + 1]);
          trackReason(ids[0], ids[i + 1], "Same Business Name");
        }
      }
    });

    // Process Phone groups
    Object.entries(phoneGroups).forEach(([_, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          unionRoots(ids[0], ids[i + 1]);
          trackReason(ids[0], ids[i + 1], "Same Phone Number");
        }
      }
    });

    // Process Email groups
    Object.entries(emailGroups).forEach(([_, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          unionRoots(ids[0], ids[i + 1]);
          trackReason(ids[0], ids[i + 1], "Same Email Address");
        }
      }
    });

    // Process Address groups
    Object.entries(addressGroups).forEach(([_, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          unionRoots(ids[0], ids[i + 1]);
          trackReason(ids[0], ids[i + 1], "Same Physical Address");
        }
      }
    });

    // Process Website groups
    Object.entries(websiteGroups).forEach(([_, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          unionRoots(ids[0], ids[i + 1]);
          trackReason(ids[0], ids[i + 1], "Same Website Domain");
        }
      }
    });

    // Group into clusters
    ads.forEach(ad => {
      if (!ad || !ad.id) return;
      const root = findRoot(ad.id);
      if (!clustersMap[root]) {
        clustersMap[root] = {
          primaryTitle: ad.title || "Untitled Business",
          matchReasons: new Set(),
          adsMap: new Map()
        };
      }
      clustersMap[root].adsMap.set(ad.id, ad);
      if (matchReasonTracker[ad.id]) {
        matchReasonTracker[ad.id].forEach(r => clustersMap[root].matchReasons.add(r));
      }
    });

    // Filter to only clusters with >= 2 ads
    const results: DuplicateCluster[] = [];
    Object.entries(clustersMap).forEach(([rootId, data]) => {
      const clusterAds = Array.from(data.adsMap.values());
      if (clusterAds.length >= 2) {
        let hasCsv = false;
        let hasUser = false;
        let hasVerified = false;
        let maxTier = "FREE";

        clusterAds.forEach(a => {
          const isCsv = a.id?.startsWith("csv_") || a.id?.startsWith("csv-") || a.isGoogleImport;
          if (isCsv) hasCsv = true;
          else hasUser = true;

          if (a.verified || a.isPremium || a.isSponsor) hasVerified = true;
          if (a.isSponsor) maxTier = "SPONSOR";
          else if (a.isPremium && maxTier !== "SPONSOR") maxTier = "PREMIUM";
        });

        // Choose best representative title
        const bestTitle = clusterAds.find(a => !a.id?.startsWith("csv_") && !a.id?.startsWith("csv-"))?.title || clusterAds[0]?.title || "Business";

        results.push({
          id: rootId,
          primaryTitle: bestTitle,
          matchReasons: Array.from(data.matchReasons),
          ads: clusterAds,
          hasCsv,
          hasUser,
          hasVerified,
          maxTier
        });
      }
    });

    return results;
  }, [ads]);

  // Filter and sort duplicate clusters
  const filteredClusters = useMemo(() => {
    let list = [...duplicateClusters];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(cluster => {
        if (cluster.primaryTitle.toLowerCase().includes(q)) return true;
        return cluster.ads.some(a => 
          (a.title || "").toLowerCase().includes(q) ||
          (a.phone || "").toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q) ||
          (a.address || "").toLowerCase().includes(q) ||
          (a.city || a.location || "").toLowerCase().includes(q) ||
          (a.suburb || "").toLowerCase().includes(q) ||
          (a.category || "").toLowerCase().includes(q) ||
          (a.id || "").toLowerCase().includes(q)
        );
      });
    }

    if (matchFilter !== "all") {
      const filterMap: Record<string, string> = {
        name: "Same Business Name",
        phone: "Same Phone Number",
        email: "Same Email Address",
        address: "Same Physical Address"
      };
      const requiredReason = filterMap[matchFilter];
      if (requiredReason) {
        list = list.filter(c => c.matchReasons.includes(requiredReason));
      }
    }

    if (sourceFilter === "mixed") {
      list = list.filter(c => c.hasCsv && c.hasUser);
    } else if (sourceFilter === "csv_only") {
      list = list.filter(c => c.hasCsv && !c.hasUser);
    } else if (sourceFilter === "user_only") {
      list = list.filter(c => !c.hasCsv && c.hasUser);
    }

    if (sortBy === "count_desc") {
      list.sort((a, b) => b.ads.length - a.ads.length);
    } else if (sortBy === "title_asc") {
      list.sort((a, b) => a.primaryTitle.localeCompare(b.primaryTitle));
    } else if (sortBy === "newest") {
      list.sort((a, b) => {
        const dateA = a.ads[0]?.createdAt || "";
        const dateB = b.ads[0]?.createdAt || "";
        return dateB.localeCompare(dateA);
      });
    }

    return list;
  }, [duplicateClusters, searchQuery, matchFilter, sourceFilter, sortBy]);

  // Pagination for clusters
  const totalPages = Math.max(1, Math.ceil(filteredClusters.length / itemsPerPage));
  const paginatedClusters = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * itemsPerPage;
    return filteredClusters.slice(start, start + itemsPerPage);
  }, [filteredClusters, currentPage, totalPages, itemsPerPage]);

  // Statistics
  const totalDuplicateAds = useMemo(() => {
    return duplicateClusters.reduce((acc, c) => acc + c.ads.length, 0);
  }, [duplicateClusters]);

  const mixedDuplicatesCount = useMemo(() => {
    return duplicateClusters.filter(c => c.hasCsv && c.hasUser).length;
  }, [duplicateClusters]);

  // Toggle Cluster Expansion
  const toggleCluster = (clusterId: string) => {
    setExpandedClusterIds(prev => ({
      ...prev,
      [clusterId]: prev[clusterId] === undefined ? false : !prev[clusterId]
    }));
  };

  // Toggle Select Ad for batch actions
  const toggleSelectAd = (adId: string) => {
    setSelectedAdIds(prev => 
      prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
    );
  };

  const selectAllInCluster = (cluster: DuplicateCluster) => {
    const ids = cluster.ads.map(a => a.id);
    const allSelected = ids.every(id => selectedAdIds.includes(id));
    if (allSelected) {
      setSelectedAdIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedAdIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  // ACTIONS

  // Delete Single Ad
  const handleDeleteAd = (adId: string) => {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    deleteAd(adId);
    const updated = ads.filter(a => a.id !== adId);
    onUpdateAds(updated);
    setSelectedAdIds(prev => prev.filter(id => id !== adId));
  };

  // Batch Delete Selected Ads
  const handleBatchDeleteSelected = () => {
    if (selectedAdIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${selectedAdIds.length} selected listings?`)) return;

    selectedAdIds.forEach(id => deleteAd(id));
    const selectedSet = new Set(selectedAdIds);
    const updated = ads.filter(a => !selectedSet.has(a.id));
    onUpdateAds(updated);
    setSelectedAdIds([]);
    alert(`Successfully removed ${selectedSet.size} listings.`);
  };

  // Keep Newest & Delete Older in Cluster
  const handleKeepNewest = (cluster: DuplicateCluster) => {
    if (cluster.ads.length < 2) return;
    if (!confirm(`Keep the newest listing for "${cluster.primaryTitle}" and delete the other ${cluster.ads.length - 1} duplicate copies?`)) return;

    // Sort by createdAt descending or ID
    const sorted = [...cluster.ads].sort((a, b) => {
      const dateA = a.createdAt || "";
      const dateB = b.createdAt || "";
      return dateB.localeCompare(dateA);
    });

    const keeper = sorted[0];
    const toDelete = sorted.slice(1);

    toDelete.forEach(a => deleteAd(a.id));
    const deleteIds = new Set(toDelete.map(a => a.id));
    const updated = ads.filter(a => !deleteIds.has(a.id));
    onUpdateAds(updated);
    alert(`Kept listing [${keeper.id}] and deleted ${toDelete.length} older duplicate copies.`);
  };

  // Keep Verified/User and Delete Unverified CSV copies
  const handleKeepVerifiedOrUser = (cluster: DuplicateCluster) => {
    if (cluster.ads.length < 2) return;
    
    // Priority: Verified/Premium > User-created > CSV
    const sorted = [...cluster.ads].sort((a, b) => {
      const scoreA = (a.verified || a.isPremium || a.isSponsor ? 100 : 0) + (a.id?.startsWith("csv_") || a.id?.startsWith("csv-") ? 0 : 50);
      const scoreB = (b.verified || b.isPremium || b.isSponsor ? 100 : 0) + (b.id?.startsWith("csv_") || b.id?.startsWith("csv-") ? 0 : 50);
      return scoreB - scoreA;
    });

    const keeper = sorted[0];
    const toDelete = sorted.slice(1);

    if (!confirm(`Keep the highest-priority listing "${keeper.title}" (${keeper.verified ? 'Verified' : keeper.id?.startsWith('csv') ? 'CSV' : 'User Created'}) and delete ${toDelete.length} duplicate copies?`)) return;

    toDelete.forEach(a => deleteAd(a.id));
    const deleteIds = new Set(toDelete.map(a => a.id));
    const updated = ads.filter(a => !deleteIds.has(a.id));
    onUpdateAds(updated);
    alert(`Kept prioritized listing [${keeper.id}] and removed ${toDelete.length} duplicates.`);
  };

  // Delete All In Cluster
  const handleDeleteCluster = (cluster: DuplicateCluster) => {
    if (!confirm(`Are you sure you want to delete ALL ${cluster.ads.length} listings in the "${cluster.primaryTitle}" duplicate cluster?`)) return;

    cluster.ads.forEach(a => deleteAd(a.id));
    const deleteIds = new Set(cluster.ads.map(a => a.id));
    const updated = ads.filter(a => !deleteIds.has(a.id));
    onUpdateAds(updated);
    alert(`Deleted all ${cluster.ads.length} listings in cluster.`);
  };

  // SMART MERGE
  const openMergeModal = (cluster: DuplicateCluster) => {
    setMergingCluster(cluster);
    // Default master is verified or user-created or first
    const bestDefault = cluster.ads.find(a => a.verified || a.isPremium || a.isSponsor) || 
                        cluster.ads.find(a => !a.id?.startsWith("csv_") && !a.id?.startsWith("csv-")) || 
                        cluster.ads[0];
    setMasterAdIdForMerge(bestDefault ? bestDefault.id : cluster.ads[0]?.id || "");
  };

  const handleExecuteMerge = () => {
    if (!mergingCluster || !masterAdIdForMerge) return;

    const master = mergingCluster.ads.find(a => a.id === masterAdIdForMerge);
    if (!master) return;

    const otherAds = mergingCluster.ads.filter(a => a.id !== masterAdIdForMerge);

    // Merge best non-empty values into master
    const merged: Record<string, any> = { ...master };

    otherAds.forEach(other => {
      if (!merged.phone && other.phone) merged.phone = other.phone;
      if (!merged.email && other.email) merged.email = other.email;
      if (!merged.website && other.website) merged.website = other.website;
      if (!merged.address && other.address) merged.address = other.address;
      if ((!merged.servicesOffered || merged.servicesOffered.length < 10) && other.servicesOffered) {
        merged.servicesOffered = other.servicesOffered;
      }
      if ((!merged.description || merged.description.length < 20) && other.description) {
        merged.description = other.description;
      }
      if (!merged.suburb && other.suburb) merged.suburb = other.suburb;
      if (other.verified || other.isPremium) {
        merged.verified = true;
      }
      if (other.isPremium) merged.isPremium = true;
      if (other.isSponsor) merged.isSponsor = true;
    });

    const cleanedMaster = cleanAd(merged);

    // Delete other ads
    otherAds.forEach(a => deleteAd(a.id));

    // Update ads array
    const otherIdsSet = new Set(otherAds.map(a => a.id));
    const updated = ads
      .filter(a => !otherIdsSet.has(a.id))
      .map(a => a.id === masterAdIdForMerge ? cleanedMaster : a);

    onUpdateAds(updated);
    saveStoredAds(updated);
    setMergingCluster(null);
    alert(`Successfully merged ${mergingCluster.ads.length} listings into Master Listing [${master.id}].`);
  };

  // EDIT AD FORM
  const handleSaveEditAd = () => {
    if (!editingAd) return;

    const cleaned = cleanAd({
      ...editingAd,
      title: editingAd.title?.trim() || "Untitled Business",
      category: editingAd.category?.trim() || "Other",
      province: editingAd.province || "gauteng",
      location: editingAd.location || editingAd.city || "Johannesburg",
      city: editingAd.city || editingAd.location || "Johannesburg",
      suburb: editingAd.suburb || "",
      phone: editingAd.phone || "",
      email: editingAd.email || "",
      website: editingAd.website || "",
      address: editingAd.address || "",
      servicesOffered: editingAd.servicesOffered || "",
      description: editingAd.description || ""
    });

    const updated = ads.map(a => a.id === cleaned.id ? cleaned : a);
    onUpdateAds(updated);
    saveStoredAds(updated);
    setEditingAd(null);
    alert("Listing successfully updated!");
  };

  // CLONE / DUPLICATE AD TO MULTIPLE LOCATIONS
  const openCloneModal = (ad: any) => {
    setCloningAd(ad);
    setCloneForm({
      title: `${ad.title || "Business"} (Branch / Copy)`,
      province: ad.province || "gauteng",
      city: ad.city || ad.location || "Johannesburg",
      suburb: ad.suburb || "",
      phone: ad.phone || "",
      category: ad.category || "Other"
    });
  };

  const handleExecuteClone = () => {
    if (!cloningAd) return;

    const newId = `custom_clone_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const clonedAd = cleanAd({
      ...cloningAd,
      id: newId,
      title: cloneForm.title.trim() || cloningAd.title,
      province: cloneForm.province,
      location: cloneForm.city,
      city: cloneForm.city,
      suburb: cloneForm.suburb,
      phone: cloneForm.phone || cloningAd.phone,
      category: cloneForm.category || cloningAd.category,
      createdAt: new Date().toISOString(),
      isGoogleImport: false
    });

    const updated = [clonedAd, ...ads];
    onUpdateAds(updated);
    saveStoredAds(updated);
    setCloningAd(null);
    alert(`Successfully cloned ad as new listing [${newId}]!`);
  };

  // PROVISION NEW SINGLE AD
  const handleCreateNewAd = () => {
    if (!newAdForm.title.trim()) {
      alert("Please enter a Business Name / Title.");
      return;
    }

    const newId = `custom_admin_${Date.now()}`;
    const parsedLoc = findSuburbAndTown(newAdForm.province, newAdForm.address || newAdForm.suburb, newAdForm.city);

    const isPremiumVal = newAdForm.tier === "PREMIUM" || newAdForm.tier === "SPONSOR";
    const isSponsorVal = newAdForm.tier === "SPONSOR";

    const newAd = cleanAd({
      id: newId,
      userId: "admin",
      title: newAdForm.title.trim(),
      category: newAdForm.category,
      province: newAdForm.province,
      location: newAdForm.city || parsedLoc.town,
      city: newAdForm.city || parsedLoc.town,
      suburb: newAdForm.suburb || parsedLoc.suburb,
      address: newAdForm.address.trim(),
      phone: newAdForm.phone.trim(),
      email: newAdForm.email.trim(),
      website: newAdForm.website.trim(),
      servicesOffered: newAdForm.servicesOffered.trim(),
      description: newAdForm.description.trim() || `${newAdForm.category} business in ${newAdForm.city}, South Africa.`,
      verified: newAdForm.verified || isPremiumVal,
      isPremium: isPremiumVal,
      isSponsor: isSponsorVal,
      isClaimed: true,
      isGoogleImport: false,
      createdAt: new Date().toISOString()
    });

    const updated = [newAd, ...ads];
    onUpdateAds(updated);
    saveStoredAds(updated);
    setIsCreatingNewAd(false);
    setNewAdForm({
      title: "",
      category: "Other",
      province: "gauteng",
      city: "Johannesburg",
      suburb: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      servicesOffered: "",
      description: "",
      tier: "FREE",
      verified: false
    });
    alert("New advertisement listing successfully provisioned!");
  };

  // BATCH PROVISION MULTIPLE ADS
  const handleExecuteBatchCreate = () => {
    if (!batchRawText.trim()) {
      alert("Please enter listing entries (one per line). Format: Business Name | City | Phone | Category");
      return;
    }

    const lines = batchRawText.split(/\r?\n/).filter(l => l.trim() !== "");
    const generated: any[] = [];

    lines.forEach((line, index) => {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length === 0 || !parts[0]) return;

      const title = parts[0];
      const city = parts[1] || "Johannesburg";
      const phone = parts[2] || "";
      const cat = parts[3] || batchCategory;
      const address = parts[4] || "";

      const newId = `batch_ad_${Date.now()}_${index}`;
      generated.push(cleanAd({
        id: newId,
        userId: "admin",
        title,
        province: batchProvince,
        location: city,
        city: city,
        suburb: "",
        address: address,
        phone: phone,
        email: "",
        website: "",
        category: cat,
        servicesOffered: "",
        description: `${cat} business operating in ${city}, ${batchProvince}.`,
        verified: false,
        isPremium: false,
        isSponsor: false,
        isClaimed: false,
        isGoogleImport: false,
        createdAt: new Date().toISOString()
      }));
    });

    if (generated.length === 0) {
      alert("No valid lines parsed.");
      return;
    }

    const updated = [...generated, ...ads];
    onUpdateAds(updated);
    saveStoredAds(updated);
    setBatchRawText("");
    alert(`Successfully generated and provisioned ${generated.length} new advertisements!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER HERO DOCK */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border border-emerald-500/30">
                Directory Integrity Engine
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border border-indigo-500/30">
                Live Scanner
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-emerald-400 shrink-0" />
              Duplicate & Multi-Ad Control Center
            </h2>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Detect, inspect, edit, merge, clone, and bulk-manage multiple or duplicate advertisements created by community users or ingested from bulk CSV directory uploads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreatingNewAd(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Provision Single Ad
            </button>
            <button
              onClick={() => setViewMode(viewMode === "multi_creator" ? "duplicates" : "multi_creator")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {viewMode === "multi_creator" ? "View Duplicates" : "Bulk Ad Generator"}
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Total Duplicate Sets</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">{duplicateClusters.length}</span>
              <span className="text-xs text-slate-400">clusters</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Total Duplicated Ads</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">{totalDuplicateAds}</span>
              <span className="text-xs text-slate-400">listings</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">User vs CSV Conflicts</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-300 font-mono">{mixedDuplicatesCount}</span>
              <span className="text-xs text-slate-400">cross-source</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Total Live Database</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">{ads.length}</span>
              <span className="text-xs text-slate-400">ads total</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-VIEW NAVIGATION SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("duplicates")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              viewMode === "duplicates"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Copy className="w-4 h-4 text-amber-500" />
            Duplicate Clusters ({duplicateClusters.length})
          </button>
          <button
            onClick={() => setViewMode("multi_creator")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              viewMode === "multi_creator"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Bulk & Batch Generator
          </button>
          <button
            onClick={() => setViewMode("all_ads")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              viewMode === "all_ads"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-500" />
            All Multi-Ads ({ads.length})
          </button>
        </div>

        {selectedAdIds.length > 0 && (
          <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-xl animate-in fade-in">
            <span className="text-xs font-bold text-rose-800">
              {selectedAdIds.length} listings selected
            </span>
            <button
              onClick={handleBatchDeleteSelected}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow-sm flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedAdIds([])}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: DUPLICATE CLUSTERS */}
      {viewMode === "duplicates" && (
        <div className="space-y-6">
          
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Search */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Search Duplicates</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email, address..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                  />
                </div>
              </div>

              {/* Match Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Match Reason</label>
                <select
                  value={matchFilter}
                  onChange={(e) => { setMatchFilter(e.target.value as any); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-semibold"
                >
                  <option value="all">All Duplicate Reasons</option>
                  <option value="name">Same Business Name</option>
                  <option value="phone">Same Phone Number</option>
                  <option value="email">Same Email Address</option>
                  <option value="address">Same Street Address</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Source Conflict</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value as any); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-semibold"
                >
                  <option value="all">All Sources</option>
                  <option value="mixed">Mixed (User vs CSV)</option>
                  <option value="csv_only">CSV vs CSV Only</option>
                  <option value="user_only">User vs User Only</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sort Clusters By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-semibold"
                >
                  <option value="count_desc">Most Duplicates First</option>
                  <option value="title_asc">Business Name (A-Z)</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Quick Helper Filter Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Showing <strong>{filteredClusters.length}</strong> duplicate clusters ({filteredClusters.reduce((a, c) => a + c.ads.length, 0)} total ads).</span>
              </div>

              {(searchQuery || matchFilter !== "all" || sourceFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setMatchFilter("all");
                    setSourceFilter("all");
                  }}
                  className="text-[10px] font-bold uppercase text-emerald-700 hover:text-emerald-900 border-b border-emerald-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* DUPLICATE CLUSTERS LIST */}
          {filteredClusters.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">No duplicate listings detected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All business records in the directory appear to have unique titles, phone numbers, and addresses.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedClusters.map((cluster) => {
                const isExpanded = expandedClusterIds[cluster.id] !== false; // expanded by default
                const allSelected = cluster.ads.every(a => selectedAdIds.includes(a.id));

                return (
                  <div 
                    key={cluster.id} 
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition hover:border-slate-300"
                  >
                    {/* CLUSTER HEADER */}
                    <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => selectAllInCluster(cluster)}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Select all in this cluster"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                              {cluster.primaryTitle}
                            </h3>
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200 font-mono">
                              {cluster.ads.length} Duplicates
                            </span>
                            {cluster.hasCsv && cluster.hasUser && (
                              <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-200">
                                ⚠ User & CSV Conflict
                              </span>
                            )}
                            {cluster.hasVerified && (
                              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-700" /> Verified Listing Included
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-600">Match Reasons:</span>
                            {cluster.matchReasons.map((reason, idx) => (
                              <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* CLUSTER QUICK ACTION BUTTONS */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => openMergeModal(cluster)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          title="Merge all duplicate copies into one master listing"
                        >
                          <GitMerge className="w-3.5 h-3.5" /> Merge to 1 Master
                        </button>
                        <button
                          onClick={() => handleKeepNewest(cluster)}
                          className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          title="Keep the most recently created listing and delete older duplicates"
                        >
                          Keep Newest
                        </button>
                        {cluster.hasVerified && (
                          <button
                            onClick={() => handleKeepVerifiedOrUser(cluster)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
                            title="Keep verified listing and remove unverified CSV duplicates"
                          >
                            Keep Verified
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCluster(cluster)}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition"
                          title="Delete all listings in this cluster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleCluster(cluster.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 transition"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* CLUSTER ADS COMPARISON GRID */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/40">
                        {cluster.ads.map((ad, adIdx) => {
                          const isCsv = ad.id?.startsWith("csv_") || ad.id?.startsWith("csv-") || ad.isGoogleImport;
                          const isSelected = selectedAdIds.includes(ad.id);

                          return (
                            <div
                              key={ad.id || adIdx}
                              className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                                isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10" : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Ad Header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectAd(ad.id)}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                      #{adIdx + 1} • {ad.id}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isCsv ? (
                                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        CSV Import
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        User Created
                                      </span>
                                    )}

                                    {ad.verified || ad.isPremium ? (
                                      <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        Unclaimed
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Title & Category */}
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                    {ad.title}
                                  </h4>
                                  <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                                    📂 {ad.category || "Other"}
                                  </div>
                                </div>

                                {/* Details / Contact info */}
                                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {ad.suburb ? `${ad.suburb}, ` : ""}{ad.location || ad.city || "South Africa"} ({ad.province || "RSA"})
                                    </span>
                                  </div>
                                  {ad.address && (
                                    <div className="text-[11px] text-slate-500 pl-5 truncate" title={ad.address}>
                                      {ad.address}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-800">
                                      {ad.phone || "No phone listed"}
                                    </span>
                                  </div>
                                  {ad.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate text-slate-800">{ad.email}</span>
                                    </div>
                                  )}
                                  {ad.website && (
                                    <div className="flex items-center gap-2">
                                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate text-indigo-600 font-mono text-[10px]">{ad.website}</span>
                                    </div>
                                  )}
                                </div>

                                {ad.servicesOffered && (
                                  <div className="text-[11px] text-slate-500 line-clamp-2 italic">
                                    &ldquo;{ad.servicesOffered}&rdquo;
                                  </div>
                                )}
                              </div>

                              {/* Card Actions */}
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => onViewAd(ad)}
                                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                    title="View Full Public Detail"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingAd(ad)}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition"
                                    title="Edit Listing"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openCloneModal(ad)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition"
                                    title="Clone to another location/branch"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleDeleteAd(ad.id)}
                                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  title="Delete this copy"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* VIEW MODE 2: BULK & BATCH GENERATOR */}
      {viewMode === "multi_creator" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="border-b border-slate-100 pb-6 mb-6">
              <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Bulk Multi-Ad Batch Generator
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Quickly create multiple business listings simultaneously. Enter one business per line using the pipe delimiter (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">|</code>).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Default Province</label>
                <select
                  value={batchProvince}
                  onChange={(e) => setBatchProvince(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-bold"
                >
                  {SA_PROVINCES.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Default Category</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-bold"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Listing Entries (One per line)
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  Format: Business Name | City | Phone | Category | Address
                </span>
              </div>
              <textarea
                rows={8}
                value={batchRawText}
                onChange={(e) => setBatchRawText(e.target.value)}
                placeholder={`Acme Plumbers Durban | Durban | 0821234567 | Plumbers | 12 Smith St&#10;Acme Plumbers Umhlanga | Umhlanga | 0821234567 | Plumbers | 45 Lighthouse Rd&#10;Solar King Johannesburg | Sandton | 0119876543 | Solar Power Installers | 88 Rivonia Rd&#10;Quick Cleaners Cape Town | Cape Town | 0215551234 | Cleaning Services | 10 Kloof St`}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-slate-900 leading-relaxed"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Tip: You can generate branch listings for national franchises in seconds.
              </div>
              <button
                onClick={handleExecuteBatchCreate}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Provision All Listed Ads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: ALL ADS MULTI-MANAGEMENT */}
      {viewMode === "all_ads" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Directory Listings Register ({ads.length})</h3>
                <p className="text-xs text-slate-500">Quick-access view to edit, clone, or remove any advertisement.</p>
              </div>
              <button
                onClick={() => setIsCreatingNewAd(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Listing
              </button>
            </div>

            {/* Simple search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filter all ads by title, phone, city, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* List Table */}
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 sticky top-0 font-bold text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-left">Listing</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Contact</th>
                    <th className="p-3 text-left">Source</th>
                    <th className="p-3 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ads
                    .filter(a => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (a.title || "").toLowerCase().includes(q) ||
                        (a.phone || "").toLowerCase().includes(q) ||
                        (a.category || "").toLowerCase().includes(q) ||
                        (a.location || a.city || "").toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 100)
                    .map((ad, idx) => (
                      <tr key={ad.id || idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{ad.title}</div>
                          <div className="text-[10px] text-emerald-700 font-normal">{ad.category}</div>
                        </td>
                        <td className="p-3 text-slate-600">
                          {ad.location || ad.city || "RSA"} ({ad.province})
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {ad.phone || "—"}
                        </td>
                        <td className="p-3">
                          {ad.id?.startsWith("csv_") || ad.id?.startsWith("csv-") ? (
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-100">CSV</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-100">User</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onViewAd(ad)}
                              className="p-1 text-slate-500 hover:text-slate-800"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingAd(ad)}
                              className="p-1 text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openCloneModal(ad)}
                              className="p-1 text-emerald-600 hover:text-emerald-900"
                              title="Clone"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAd(ad.id)}
                              className="p-1 text-rose-600 hover:text-rose-900"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SMART MERGE CLUSTER MODAL */}
      {mergingCluster && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Smart Listing Consolidation</span>
                <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-indigo-600" />
                  Merge & Enrich &ldquo;{mergingCluster.primaryTitle}&rdquo;
                </h3>
              </div>
              <button
                onClick={() => setMergingCluster(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Select the primary <strong>Master Listing</strong> to retain. Any missing contact information, description, or verified attributes from the other {mergingCluster.ads.length - 1} duplicate copies will be automatically merged into the master listing, and the redundant copies will be safely deleted.
            </p>

            {/* Master Selection Radio Cards */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {mergingCluster.ads.map((ad, idx) => {
                const isSelectedMaster = masterAdIdForMerge === ad.id;
                const isCsv = ad.id?.startsWith("csv_") || ad.id?.startsWith("csv-");

                return (
                  <label
                    key={ad.id || idx}
                    onClick={() => setMasterAdIdForMerge(ad.id)}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelectedMaster 
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="master_ad_radio"
                        checked={isSelectedMaster}
                        onChange={() => setMasterAdIdForMerge(ad.id)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{ad.title}</span>
                          {isSelectedMaster && (
                            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Selected Master
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          📍 {ad.location || ad.city || "RSA"} • 📞 {ad.phone || "No phone"} • 📂 {ad.category}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {ad.id} • {isCsv ? "CSV Ingest" : "User Listing"} {ad.verified ? "• Verified" : ""}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setMergingCluster(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteMerge}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <GitMerge className="w-4 h-4" /> Confirm & Execute Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL EDIT AD MODAL */}
      {editingAd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Listing Editor</span>
                <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Edit className="w-5 h-5 text-emerald-600" />
                  Edit Listing: {editingAd.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingAd(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Title */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Business Name / Title</label>
                <input
                  type="text"
                  value={editingAd.title || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Industry / Category</label>
                <select
                  value={editingAd.category || "Other"}
                  onChange={(e) => setEditingAd({ ...editingAd, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Province */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Province</label>
                <select
                  value={editingAd.province || "gauteng"}
                  onChange={(e) => setEditingAd({ ...editingAd, province: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                >
                  {SA_PROVINCES.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* City / Town */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">City or Town</label>
                <input
                  type="text"
                  value={editingAd.city || editingAd.location || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, city: e.target.value, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Suburb */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Suburb / Area</label>
                <input
                  type="text"
                  value={editingAd.suburb || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, suburb: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingAd.phone || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingAd.email || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Physical Street Address */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Physical Street Address</label>
                <input
                  type="text"
                  value={editingAd.address || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Website */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Website URL</label>
                <input
                  type="text"
                  value={editingAd.website || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, website: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Services Offered */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Services Offered</label>
                <textarea
                  rows={2}
                  value={editingAd.servicesOffered || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, servicesOffered: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editingAd.description || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              {/* Tier & Verification */}
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingAd.verified === true}
                      onChange={(e) => setEditingAd({ ...editingAd, verified: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Verified Listing Badge
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingAd.isPremium === true}
                      onChange={(e) => setEditingAd({ ...editingAd, isPremium: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Premium Tier
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingAd.isSponsor === true}
                      onChange={(e) => setEditingAd({ ...editingAd, isSponsor: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Featured Sponsor
                  </label>
                </div>

                <span className="text-[10px] font-mono text-slate-400">
                  ID: {editingAd.id}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingAd(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditAd}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CLONE AD TO BRANCH / NEW LOCATION */}
      {cloningAd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Multi-Location Cloner</span>
                <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Copy className="w-5 h-5 text-emerald-600" />
                  Clone Listing / Branch
                </h3>
              </div>
              <button
                onClick={() => setCloningAd(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create a duplicate copy of <strong>&ldquo;{cloningAd.title}&rdquo;</strong> for a new suburb, town, or regional branch.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">New Listing Title</label>
                <input
                  type="text"
                  value={cloneForm.title}
                  onChange={(e) => setCloneForm({ ...cloneForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Target Province</label>
                  <select
                    value={cloneForm.province}
                    onChange={(e) => setCloneForm({ ...cloneForm, province: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                  >
                    {SA_PROVINCES.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Target City/Town</label>
                  <input
                    type="text"
                    value={cloneForm.city}
                    onChange={(e) => setCloneForm({ ...cloneForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Suburb / Area</label>
                  <input
                    type="text"
                    value={cloneForm.suburb}
                    onChange={(e) => setCloneForm({ ...cloneForm, suburb: e.target.value })}
                    placeholder="e.g. Durban North"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Branch Phone (Optional)</label>
                  <input
                    type="text"
                    value={cloneForm.phone}
                    onChange={(e) => setCloneForm({ ...cloneForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCloningAd(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClone}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Create Cloned Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PROVISION SINGLE AD */}
      {isCreatingNewAd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Directory Management</span>
                <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Provision New Business Listing
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingNewAd(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Solar Solutions"
                  value={newAdForm.title}
                  onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Category</label>
                <select
                  value={newAdForm.category}
                  onChange={(e) => setNewAdForm({ ...newAdForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Province</label>
                <select
                  value={newAdForm.province}
                  onChange={(e) => setNewAdForm({ ...newAdForm, province: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                >
                  {SA_PROVINCES.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">City / Town</label>
                <input
                  type="text"
                  placeholder="e.g. Pretoria"
                  value={newAdForm.city}
                  onChange={(e) => setNewAdForm({ ...newAdForm, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Suburb / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Hatfield"
                  value={newAdForm.suburb}
                  onChange={(e) => setNewAdForm({ ...newAdForm, suburb: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 082 123 4567"
                  value={newAdForm.phone}
                  onChange={(e) => setNewAdForm({ ...newAdForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. info@acmesolar.co.za"
                  value={newAdForm.email}
                  onChange={(e) => setNewAdForm({ ...newAdForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main Street"
                  value={newAdForm.address}
                  onChange={(e) => setNewAdForm({ ...newAdForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Services Offered</label>
                <input
                  type="text"
                  placeholder="e.g. Solar panels, Inverters, Battery backup, Maintenance"
                  value={newAdForm.servicesOffered}
                  onChange={(e) => setNewAdForm({ ...newAdForm, servicesOffered: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Initial Plan Tier</label>
                <select
                  value={newAdForm.tier}
                  onChange={(e) => setNewAdForm({ ...newAdForm, tier: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold"
                >
                  <option value="FREE">Basic Free (Unclaimed)</option>
                  <option value="PREMIUM">Premium Verified</option>
                  <option value="SPONSOR">Featured Sponsor</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAdForm.verified}
                    onChange={(e) => setNewAdForm({ ...newAdForm, verified: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Mark as Verified Listing
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsCreatingNewAd(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewAd}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Listing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
