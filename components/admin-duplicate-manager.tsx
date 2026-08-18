"use client";

import React, { useState, useMemo } from "react";
import { 
  Copy, 
  Trash2, 
  Edit, 
  Eye, 
  Search, 
  Sparkles, 
  Plus, 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink, 
  Layers, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Share2, 
  RefreshCw,
  PhoneOff,
  Tag,
  ArrowRight,
  Filter
} from "lucide-react";
import { SA_PROVINCES, findSuburbAndTown } from "@/lib/locations";
import { CATEGORIES_STRUCTURED } from "@/lib/categories";
import { cleanAd } from "@/lib/clean-ad";
import { saveStoredAds, deleteAd } from "@/lib/data";

interface AdminDuplicateManagerProps {
  ads: any[];
  onUpdateAds: (updated: any[]) => void;
  onViewAd: (ad: any) => void;
  users?: any[];
}

export type DuplicateMode = "phone" | "name" | "address_category" | "all" | "no_phone";

export interface DuplicateCluster {
  id: string;
  clusterType: "phone" | "name" | "address_category" | "mixed";
  primaryTitle: string;
  matchIdentifier: string; // e.g. "Phone: 011 789 1234" or "Name: Auto Repair Centre"
  matchReasons: string[];
  ads: any[];
  hasCsv: boolean;
  hasUser: boolean;
  hasVerified: boolean;
  masterCandidateId: string;
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
    return digits.slice(-9); // Match last 9 digits for SA phone numbers
  }
  return "";
}

function normalizeAddress(addr: string): string {
  if (!addr || addr === "·" || addr === "") return "";
  return addr
    .toLowerCase()
    .replace(/\b(st|street|rd|road|ave|avenue|dr|drive|cnr|corner|cl|close|way|pl|place|blvd|suite|unit)\b/gi, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(cat: string): string {
  if (!cat) return "other";
  return cat.toLowerCase().trim();
}

export default function AdminDuplicateManager({
  ads,
  onUpdateAds,
  onViewAd,
  users = []
}: AdminDuplicateManagerProps) {
  // Main view switcher
  const [activeTab, setActiveTab] = useState<"duplicates" | "no_phone_cleaner" | "generator" | "all_ads">("duplicates");
  
  // Duplicate Mode: EXACT options requested by user
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("phone");

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "mixed" | "csv" | "user">("all");
  const [sortBy, setSortBy] = useState<"count_desc" | "title_asc" | "newest">("count_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // Selected ads for batch action
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [expandedClusterIds, setExpandedClusterIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [mergingCluster, setMergingCluster] = useState<DuplicateCluster | null>(null);
  const [masterAdIdForMerge, setMasterAdIdForMerge] = useState<string>("");
  const [isCreatingSingleAd, setIsCreatingSingleAd] = useState(false);

  // Single ad form state
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
    verified: false
  });

  // Batch generation text form
  const [batchRawText, setBatchRawText] = useState("");
  const [batchProvince, setBatchProvince] = useState("gauteng");
  const [batchCategory, setBatchCategory] = useState("Other");

  // ADS WITH NO PHONE NUMBER
  const adsWithNoPhone = useMemo(() => {
    return ads.filter(ad => {
      if (!ad) return false;
      const cleanPh = (ad.phone || "").replace(/[\s\-\(\)\.]/g, "");
      return !cleanPh || cleanPh === "·" || cleanPh === "" || cleanPh.length < 7;
    });
  }, [ads]);

  // DUPLICATE DETECTION ALGORITHM BASED ON SELECTED MODE
  const allDetectedClusters: DuplicateCluster[] = useMemo(() => {
    if (!ads || ads.length === 0) return [];

    const clustersMap: Record<string, {
      clusterType: "phone" | "name" | "address_category" | "mixed";
      primaryTitle: string;
      matchIdentifier: string;
      matchReasons: Set<string>;
      adsMap: Map<string, any>;
    }> = {};

    // Grouping dictionaries
    const phoneBuckets: Record<string, any[]> = {};
    const nameBuckets: Record<string, any[]> = {};
    const addressCategoryBuckets: Record<string, any[]> = {};

    ads.forEach(ad => {
      if (!ad || !ad.id) return;

      const normPh = normalizePhone(ad.phone || "");
      const normNm = normalizeTitle(ad.title || "");
      const normAddr = normalizeAddress(ad.address || "");
      const normCat = normalizeCategory(ad.category || "");

      // 1. Phone matching
      if (normPh && normPh.length >= 7) {
        if (!phoneBuckets[normPh]) phoneBuckets[normPh] = [];
        phoneBuckets[normPh].push(ad);
      }

      // 2. Name matching
      if (normNm && normNm.length >= 3) {
        if (!nameBuckets[normNm]) nameBuckets[normNm] = [];
        nameBuckets[normNm].push(ad);
      }

      // 3. Address & Category matching
      if (normAddr && normAddr.length >= 8 && normCat) {
        const key = `${normAddr}__${normCat}`;
        if (!addressCategoryBuckets[key]) addressCategoryBuckets[key] = [];
        addressCategoryBuckets[key].push(ad);
      }
    });

    // Determine clusters based on mode
    if (duplicateMode === "phone") {
      Object.entries(phoneBuckets).forEach(([phoneKey, groupAds]) => {
        if (groupAds.length >= 2) {
          const sample = groupAds.find(a => !a.id?.startsWith("csv_") && !a.id?.startsWith("csv-")) || groupAds[0];
          clustersMap[phoneKey] = {
            clusterType: "phone",
            primaryTitle: sample.title || "Business Listing",
            matchIdentifier: `Shared Phone: ${sample.phone || phoneKey}`,
            matchReasons: new Set(["Same Phone Number"]),
            adsMap: new Map(groupAds.map(a => [a.id, a]))
          };
        }
      });
    } else if (duplicateMode === "name") {
      Object.entries(nameBuckets).forEach(([nameKey, groupAds]) => {
        if (groupAds.length >= 2) {
          const sample = groupAds.find(a => a.verified || (!a.id?.startsWith("csv_") && !a.id?.startsWith("csv-"))) || groupAds[0];
          clustersMap[nameKey] = {
            clusterType: "name",
            primaryTitle: sample.title || nameKey,
            matchIdentifier: `Same Business Name: "${sample.title}"`,
            matchReasons: new Set(["Same Business Name"]),
            adsMap: new Map(groupAds.map(a => [a.id, a]))
          };
        }
      });
    } else if (duplicateMode === "address_category") {
      Object.entries(addressCategoryBuckets).forEach(([key, groupAds]) => {
        if (groupAds.length >= 2) {
          const sample = groupAds[0];
          clustersMap[key] = {
            clusterType: "address_category",
            primaryTitle: sample.title || "Listing at Address",
            matchIdentifier: `Same Address & Category: ${sample.address} (${sample.category})`,
            matchReasons: new Set(["Same Address & Category"]),
            adsMap: new Map(groupAds.map(a => [a.id, a]))
          };
        }
      });
    } else if (duplicateMode === "all") {
      // Union find logic for ALL duplicate reasons
      const parent: Record<string, string> = {};
      const matchReasonTracker: Record<string, Set<string>> = {};

      const findRoot = (i: string): string => {
        if (!parent[i]) parent[i] = i;
        if (parent[i] === i) return i;
        parent[i] = findRoot(parent[i]);
        return parent[i];
      };

      const unionRoots = (a: string, b: string, reason: string) => {
        const rootA = findRoot(a);
        const rootB = findRoot(b);
        if (rootA !== rootB) {
          parent[rootB] = rootA;
        }
        if (!matchReasonTracker[rootA]) matchReasonTracker[rootA] = new Set();
        if (!matchReasonTracker[rootB]) matchReasonTracker[rootB] = new Set();
        matchReasonTracker[rootA].add(reason);
        matchReasonTracker[rootB].add(reason);
      };

      // Connect phone groups
      Object.values(phoneBuckets).forEach(group => {
        if (group.length > 1) {
          for (let i = 0; i < group.length - 1; i++) {
            unionRoots(group[0].id, group[i + 1].id, "Same Phone Number");
          }
        }
      });

      // Connect name groups
      Object.values(nameBuckets).forEach(group => {
        if (group.length > 1) {
          for (let i = 0; i < group.length - 1; i++) {
            unionRoots(group[0].id, group[i + 1].id, "Same Business Name");
          }
        }
      });

      // Connect address & category groups
      Object.values(addressCategoryBuckets).forEach(group => {
        if (group.length > 1) {
          for (let i = 0; i < group.length - 1; i++) {
            unionRoots(group[0].id, group[i + 1].id, "Same Address & Category");
          }
        }
      });

      // Build clusters
      ads.forEach(ad => {
        if (!ad || !ad.id) return;
        const root = findRoot(ad.id);
        if (!clustersMap[root]) {
          clustersMap[root] = {
            clusterType: "mixed",
            primaryTitle: ad.title || "Business",
            matchIdentifier: "Multiple Matching Factors",
            matchReasons: new Set(),
            adsMap: new Map()
          };
        }
        clustersMap[root].adsMap.set(ad.id, ad);
        if (matchReasonTracker[root]) {
          matchReasonTracker[root].forEach(r => clustersMap[root].matchReasons.add(r));
        }
      });
    }

    // Convert map to clusters list
    const results: DuplicateCluster[] = [];
    Object.entries(clustersMap).forEach(([rootId, data]) => {
      const clusterAds = Array.from(data.adsMap.values());
      if (clusterAds.length >= 2) {
        let hasCsv = false;
        let hasUser = false;
        let hasVerified = false;

        // Find best master candidate: Verified > User Created > CSV with most info
        let bestCandidate = clusterAds[0];
        let bestScore = -1;

        clusterAds.forEach(a => {
          const isCsv = a.id?.startsWith("csv_") || a.id?.startsWith("csv-") || a.isGoogleImport;
          if (isCsv) hasCsv = true;
          else hasUser = true;

          if (a.verified || a.isPremium || a.isSponsor) hasVerified = true;

          let score = 0;
          if (a.verified) score += 100;
          if (a.isPremium) score += 50;
          if (!isCsv) score += 30;
          if (a.phone && a.phone.length > 6) score += 20;
          if (a.email && a.email.includes("@")) score += 10;
          if (a.address && a.address.length > 5) score += 10;
          if (a.description && a.description.length > 30) score += 10;

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = a;
          }
        });

        results.push({
          id: rootId,
          clusterType: data.clusterType,
          primaryTitle: bestCandidate.title || data.primaryTitle,
          matchIdentifier: data.matchIdentifier,
          matchReasons: Array.from(data.matchReasons),
          ads: clusterAds,
          hasCsv,
          hasUser,
          hasVerified,
          masterCandidateId: bestCandidate.id
        });
      }
    });

    return results;
  }, [ads, duplicateMode]);

  // Filter and Sort duplicate clusters
  const filteredClusters = useMemo(() => {
    let list = [...allDetectedClusters];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        if (c.primaryTitle.toLowerCase().includes(q)) return true;
        if (c.matchIdentifier.toLowerCase().includes(q)) return true;
        return c.ads.some(a => 
          (a.title || "").toLowerCase().includes(q) ||
          (a.phone || "").toLowerCase().includes(q) ||
          (a.address || "").toLowerCase().includes(q) ||
          (a.city || a.location || "").toLowerCase().includes(q) ||
          (a.category || "").toLowerCase().includes(q)
        );
      });
    }

    if (provinceFilter !== "all") {
      list = list.filter(c => c.ads.some(a => (a.province || "").toLowerCase() === provinceFilter.toLowerCase()));
    }

    if (sourceFilter === "mixed") {
      list = list.filter(c => c.hasCsv && c.hasUser);
    } else if (sourceFilter === "csv") {
      list = list.filter(c => c.hasCsv && !c.hasUser);
    } else if (sourceFilter === "user") {
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
  }, [allDetectedClusters, searchQuery, provinceFilter, sourceFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredClusters.length / itemsPerPage));
  const paginatedClusters = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * itemsPerPage;
    return filteredClusters.slice(start, start + itemsPerPage);
  }, [filteredClusters, currentPage, totalPages, itemsPerPage]);

  // Expand / Collapse cluster
  const toggleCluster = (id: string) => {
    setExpandedClusterIds(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  // Toggle selection
  const toggleSelectAd = (id: string) => {
    setSelectedAdIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
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
  const handleDeleteSingleAd = (adId: string) => {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    deleteAd(adId);
    const updated = ads.filter(a => a.id !== adId);
    onUpdateAds(updated);
    saveStoredAds(updated);
    setSelectedAdIds(prev => prev.filter(id => id !== adId));
  };

  // Batch Delete Selected
  const handleBatchDeleteSelected = () => {
    if (selectedAdIds.length === 0) return;
    if (!confirm(`Permanently delete all ${selectedAdIds.length} selected listings?`)) return;

    selectedAdIds.forEach(id => deleteAd(id));
    const selectedSet = new Set(selectedAdIds);
    const updated = ads.filter(a => !selectedSet.has(a.id));
    onUpdateAds(updated);
    saveStoredAds(updated);
    setSelectedAdIds([]);
    alert(`Successfully deleted ${selectedSet.size} listings.`);
  };

  // Keep Master & Delete Duplicate Copies in Cluster
  const handleKeepMasterAndDeleteDuplicates = (cluster: DuplicateCluster) => {
    const master = cluster.ads.find(a => a.id === cluster.masterCandidateId) || cluster.ads[0];
    const duplicates = cluster.ads.filter(a => a.id !== master.id);

    if (!confirm(`Keep master listing "${master.title}" (${master.phone || 'No phone'}) and delete the ${duplicates.length} other duplicate copies?`)) {
      return;
    }

    duplicates.forEach(d => deleteAd(d.id));
    const deleteIds = new Set(duplicates.map(d => d.id));
    const updated = ads.filter(a => !deleteIds.has(a.id));
    onUpdateAds(updated);
    saveStoredAds(updated);
    alert(`Kept master listing [${master.id}] and deleted ${duplicates.length} duplicate copies.`);
  };

  // Delete All In Cluster
  const handleDeleteWholeCluster = (cluster: DuplicateCluster) => {
    if (!confirm(`Delete ALL ${cluster.ads.length} listings in "${cluster.primaryTitle}"?`)) return;
    cluster.ads.forEach(a => deleteAd(a.id));
    const deleteIds = new Set(cluster.ads.map(a => a.id));
    const updated = ads.filter(a => !deleteIds.has(a.id));
    onUpdateAds(updated);
    saveStoredAds(updated);
    alert(`Deleted all ${cluster.ads.length} listings in cluster.`);
  };

  // SMART MERGE TO 1 MASTER
  const openMergeModal = (cluster: DuplicateCluster) => {
    setMergingCluster(cluster);
    setMasterAdIdForMerge(cluster.masterCandidateId || cluster.ads[0]?.id || "");
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
      if (other.verified || other.isPremium) merged.verified = true;
      if (other.isPremium) merged.isPremium = true;
      if (other.isSponsor) merged.isSponsor = true;
    });

    const cleanedMaster = cleanAd(merged);

    // Delete redundant duplicates
    otherAds.forEach(a => deleteAd(a.id));

    // Save
    const otherIdsSet = new Set(otherAds.map(a => a.id));
    const updated = ads
      .filter(a => !otherIdsSet.has(a.id))
      .map(a => a.id === masterAdIdForMerge ? cleanedMaster : a);

    onUpdateAds(updated);
    saveStoredAds(updated);
    setMergingCluster(null);
    alert(`Successfully merged ${mergingCluster.ads.length} listings into Master Record!`);
  };

  // BULK DELETE ALL NO-PHONE ADS
  const handleDeleteAllNoPhoneAds = () => {
    if (adsWithNoPhone.length === 0) return;
    if (!confirm(`Are you sure you want to delete ALL ${adsWithNoPhone.length} listings that have missing/empty phone numbers?`)) return;

    adsWithNoPhone.forEach(a => deleteAd(a.id));
    const noPhoneIds = new Set(adsWithNoPhone.map(a => a.id));
    const updated = ads.filter(a => !noPhoneIds.has(a.id));
    onUpdateAds(updated);
    saveStoredAds(updated);
    alert(`Cleaned directory! Deleted ${adsWithNoPhone.length} listings without contact numbers.`);
  };

  // EDIT AD MODAL SAVE
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
      phone: editingAd.phone?.trim() || "",
      email: editingAd.email?.trim() || "",
      website: editingAd.website?.trim() || "",
      address: editingAd.address?.trim() || "",
      servicesOffered: editingAd.servicesOffered?.trim() || "",
      description: editingAd.description?.trim() || ""
    });

    const updated = ads.map(a => a.id === cleaned.id ? cleaned : a);
    onUpdateAds(updated);
    saveStoredAds(updated);
    setEditingAd(null);
    alert("Listing updated successfully!");
  };

  // CREATE SINGLE AD
  const handleCreateSingleAd = () => {
    if (!newAdForm.title.trim()) {
      alert("Please enter a Business Name.");
      return;
    }
    if (!newAdForm.phone.trim()) {
      alert("Please enter a Contact Phone Number for this listing.");
      return;
    }

    const newId = `custom_ad_${Date.now()}`;
    const parsedLoc = findSuburbAndTown(newAdForm.province, newAdForm.address || newAdForm.suburb, newAdForm.city);

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
      description: newAdForm.description.trim() || `${newAdForm.category} business in ${newAdForm.city}.`,
      verified: newAdForm.verified,
      isPremium: false,
      isSponsor: false,
      isClaimed: true,
      isGoogleImport: false,
      createdAt: new Date().toISOString()
    });

    const updated = [newAd, ...ads];
    onUpdateAds(updated);
    saveStoredAds(updated);
    setIsCreatingSingleAd(false);
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
      verified: false
    });
    alert("New listing successfully created!");
  };

  // BATCH PROVISION ADS
  const handleExecuteBatchCreate = () => {
    if (!batchRawText.trim()) {
      alert("Please enter listings (one per line). Format: Business Name | City | Phone Number | Category | Street Address");
      return;
    }

    const lines = batchRawText.split(/\r?\n/).filter(l => l.trim() !== "");
    const generated: any[] = [];
    let skippedNoPhone = 0;

    lines.forEach((line, index) => {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length === 0 || !parts[0]) return;

      const title = parts[0];
      const city = parts[1] || "Johannesburg";
      const phone = parts[2] || "";
      const cat = parts[3] || batchCategory;
      const address = parts[4] || "";

      // Strict phone check
      const cleanPh = phone.replace(/[\s\-\(\)\.]/g, "");
      if (!cleanPh || cleanPh.length < 7) {
        skippedNoPhone++;
        return; // SKIP if no phone
      }

      const newId = `batch_${Date.now()}_${index}`;
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
        description: `${cat} in ${city}, ${batchProvince}.`,
        verified: false,
        isPremium: false,
        isSponsor: false,
        isClaimed: false,
        isGoogleImport: false,
        createdAt: new Date().toISOString()
      }));
    });

    if (generated.length === 0) {
      alert(`No valid listings generated. ${skippedNoPhone > 0 ? `${skippedNoPhone} entries had missing/invalid phone numbers.` : ""}`);
      return;
    }

    const updated = [...generated, ...ads];
    onUpdateAds(updated);
    saveStoredAds(updated);
    setBatchRawText("");
    alert(`Successfully created ${generated.length} listings!${skippedNoPhone > 0 ? ` (${skippedNoPhone} rows without contact numbers were skipped)` : ""}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER HERO DOCK */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded border border-emerald-500/30">
                Directory Quality Control
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded border border-indigo-500/30">
                Live Scanner
              </span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-emerald-400 shrink-0" />
              Duplicate & Multi-Ad Management
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Inspect and resolve duplicate listings sharing the same phone numbers, names, or addresses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreatingSingleAd(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Single Ad
            </button>
            <button
              onClick={() => setActiveTab(activeTab === "generator" ? "duplicates" : "generator")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> {activeTab === "generator" ? "Back to Duplicates" : "Batch Generator"}
            </button>
          </div>
        </div>

        {/* QUICK STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Live Ads</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{ads.length}</span>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duplicate Sets</span>
            <span className="text-xl font-black text-amber-400 font-mono">{allDetectedClusters.length}</span>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Duplicates</span>
            <span className="text-xl font-black text-rose-400 font-mono">
              {allDetectedClusters.reduce((acc, c) => acc + c.ads.length, 0)}
            </span>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ads with No Phone</span>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-black font-mono ${adsWithNoPhone.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
                {adsWithNoPhone.length}
              </span>
              {adsWithNoPhone.length > 0 && (
                <button
                  onClick={() => setActiveTab("no_phone_cleaner")}
                  className="text-[10px] font-bold text-rose-300 hover:text-white underline cursor-pointer"
                >
                  Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOP SUB-TAB NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("duplicates")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "duplicates"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Copy className="w-4 h-4 text-amber-500" />
            Duplicate Inspector ({allDetectedClusters.length})
          </button>

          <button
            onClick={() => setActiveTab("no_phone_cleaner")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "no_phone_cleaner"
                ? "bg-rose-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-rose-700 hover:bg-rose-50"
            }`}
          >
            <PhoneOff className="w-4 h-4 text-rose-500" />
            No-Phone Cleaner ({adsWithNoPhone.length})
          </button>

          <button
            onClick={() => setActiveTab("generator")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "generator"
                ? "bg-indigo-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Batch Multi-Ad Generator
          </button>

          <button
            onClick={() => setActiveTab("all_ads")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "all_ads"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-500" />
            All Directory Ads ({ads.length})
          </button>
        </div>

        {selectedAdIds.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-rose-800">
              {selectedAdIds.length} selected
            </span>
            <button
              onClick={handleBatchDeleteSelected}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedAdIds([])}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: DUPLICATE INSPECTOR WITH EXACT USER-REQUESTED MODE OPTIONS */}
      {activeTab === "duplicates" && (
        <div className="space-y-5">
          
          {/* USER-REQUESTED MODE BUTTONS: SAME PHONE, SAME NAME, SAME ADDRESS & CATEGORY */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2.5">
              Choose Duplicate Match Criteria:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                onClick={() => { setDuplicateMode("phone"); setCurrentPage(1); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  duplicateMode === "phone"
                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Phone className={`w-4 h-4 ${duplicateMode === "phone" ? "text-emerald-600" : "text-slate-500"}`} />
                  <span className="font-bold text-xs">Same Phone Number</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Finds listings that share identical contact numbers.
                </p>
              </button>

              <button
                onClick={() => { setDuplicateMode("name"); setCurrentPage(1); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  duplicateMode === "name"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className={`w-4 h-4 ${duplicateMode === "name" ? "text-indigo-600" : "text-slate-500"}`} />
                  <span className="font-bold text-xs">Same Business Name</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Finds listings with identical company titles.
                </p>
              </button>

              <button
                onClick={() => { setDuplicateMode("address_category"); setCurrentPage(1); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  duplicateMode === "address_category"
                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className={`w-4 h-4 ${duplicateMode === "address_category" ? "text-amber-600" : "text-slate-500"}`} />
                  <span className="font-bold text-xs">Same Address & Category</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Finds duplicate listings at the same street address & trade.
                </p>
              </button>

              <button
                onClick={() => { setDuplicateMode("all"); setCurrentPage(1); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  duplicateMode === "all"
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className={`w-4 h-4 ${duplicateMode === "all" ? "text-emerald-400" : "text-slate-500"}`} />
                  <span className="font-bold text-xs">All Duplicate Factors</span>
                </div>
                <p className={`text-[11px] leading-tight ${duplicateMode === "all" ? "text-slate-300" : "text-slate-500"}`}>
                  Broad scan across phone, name, and address.
                </p>
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search in clusters..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <select
                  value={provinceFilter}
                  onChange={(e) => { setProvinceFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="all">All Provinces</option>
                  {SA_PROVINCES.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value as any); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="all">All Listing Sources</option>
                  <option value="mixed">User vs CSV Conflicts</option>
                  <option value="csv">CSV Listings Only</option>
                  <option value="user">User Created Only</option>
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="count_desc">Most Duplicates First</option>
                  <option value="title_asc">Name (A-Z)</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Found <strong>{filteredClusters.length}</strong> duplicate clusters matching criteria ({filteredClusters.reduce((a, c) => a + c.ads.length, 0)} total ads).
              </span>
              {(searchQuery || provinceFilter !== "all" || sourceFilter !== "all") && (
                <button
                  onClick={() => { setSearchQuery(""); setProvinceFilter("all"); setSourceFilter("all"); }}
                  className="text-emerald-700 font-bold hover:underline text-[11px] cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* DUPLICATE CLUSTERS ACCORDIONS / CARDS */}
          {filteredClusters.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No duplicate clusters found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No duplicate records were detected under the current criteria ({duplicateMode.replace("_", " ")}).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedClusters.map((cluster, cIdx) => {
                const isExpanded = expandedClusterIds[cluster.id] !== false; // expanded by default
                const allSelected = cluster.ads.every(a => selectedAdIds.includes(a.id));

                return (
                  <div 
                    key={cluster.id || cIdx}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* CLUSTER HEADER STRIP */}
                    <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => selectAllInCluster(cluster)}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Select all in this cluster"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-slate-900 font-display">
                              {cluster.primaryTitle}
                            </h3>
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono border border-amber-200">
                              {cluster.ads.length} Copies
                            </span>
                            {cluster.hasCsv && cluster.hasUser && (
                              <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                                ⚠ User & CSV Conflict
                              </span>
                            )}
                            {cluster.hasVerified && (
                              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-700" /> Verified Included
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                            <span className="text-emerald-700 font-bold">Match:</span> {cluster.matchIdentifier}
                          </div>
                        </div>
                      </div>

                      {/* CLUSTER ACTION BUTTONS */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => openMergeModal(cluster)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                          title="Merge all into 1 Master record and remove duplicates"
                        >
                          <GitMerge className="w-3.5 h-3.5" /> Merge to 1 Master
                        </button>
                        <button
                          onClick={() => handleKeepMasterAndDeleteDuplicates(cluster)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Keep primary master listing and delete duplicate copies"
                        >
                          Keep Best & Delete Rest
                        </button>
                        <button
                          onClick={() => handleDeleteWholeCluster(cluster)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition cursor-pointer"
                          title="Delete all listings in cluster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleCluster(cluster.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* ADS INSIDE THIS CLUSTER */}
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/40">
                        {cluster.ads.map((ad, aIdx) => {
                          const isMaster = ad.id === cluster.masterCandidateId;
                          const isCsv = ad.id?.startsWith("csv_") || ad.id?.startsWith("csv-") || ad.isGoogleImport;
                          const isSelected = selectedAdIds.includes(ad.id);

                          return (
                            <div
                              key={ad.id || aIdx}
                              className={`bg-white rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                                isMaster 
                                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" 
                                  : isSelected 
                                    ? "border-indigo-500 ring-2 ring-indigo-500/20" 
                                    : "border-slate-200"
                              }`}
                            >
                              <div className="space-y-2.5">
                                {/* Badges */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectAd(ad.id)}
                                      className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono text-slate-400">
                                      #{aIdx + 1}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1">
                                    {isMaster && (
                                      <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Master Candidate
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                      isCsv 
                                        ? "bg-slate-100 text-slate-600 border-slate-200" 
                                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    }`}>
                                      {isCsv ? "CSV Import" : "User Created"}
                                    </span>
                                  </div>
                                </div>

                                {/* Title & Category */}
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                    {ad.title}
                                  </h4>
                                  <div className="text-[11px] font-medium text-emerald-700">
                                    📂 {ad.category || "Other"}
                                  </div>
                                </div>

                                {/* Key details */}
                                <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-mono font-bold text-slate-800">
                                      {ad.phone || <span className="text-rose-500 font-normal italic">No phone</span>}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {ad.location || ad.city || "South Africa"} ({ad.province || "RSA"})
                                    </span>
                                  </div>

                                  {ad.address && (
                                    <div className="text-[10px] text-slate-500 pl-4.5 truncate" title={ad.address}>
                                      {ad.address}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Single Ad Actions */}
                              <div className="flex items-center justify-between gap-1 pt-2.5 mt-2.5 border-t border-slate-100">
                                <button
                                  onClick={() => onViewAd(ad)}
                                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <button
                                  onClick={() => setEditingAd(ad)}
                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSingleAd(ad.id)}
                                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
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
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
              <span className="text-xs text-slate-500">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: NO-PHONE NUMBER ADS CLEANER */}
      {activeTab === "no_phone_cleaner" && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <PhoneOff className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-rose-950">
                  Listings with Missing Contact Numbers ({adsWithNoPhone.length})
                </h3>
              </div>
              <p className="text-xs text-rose-800 mt-1 max-w-xl">
                These existing directory listings have no valid phone numbers. You can edit them to add phone numbers, or clean them from the database in 1 click.
              </p>
            </div>

            {adsWithNoPhone.length > 0 && (
              <button
                onClick={handleDeleteAllNoPhoneAds}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete All {adsWithNoPhone.length} Ads Without Phone
              </button>
            )}
          </div>

          {adsWithNoPhone.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">All Listings Have Contact Numbers!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Every business ad in your directory is verified to contain a valid telephone/mobile number.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {adsWithNoPhone.map((ad, idx) => (
                <div key={ad.id || idx} className="bg-white rounded-xl p-4 border border-rose-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-slate-400">ID: {ad.id}</span>
                      <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded">
                        Missing Phone
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{ad.title}</h4>
                    <div className="text-[11px] text-slate-500 mt-0.5">📂 {ad.category || "Other"} • {ad.city || ad.location || "RSA"}</div>
                    {ad.address && <p className="text-[10px] text-slate-400 mt-1 truncate">{ad.address}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setEditingAd(ad)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" /> Add Phone
                    </button>
                    <button
                      onClick={() => handleDeleteSingleAd(ad.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete ad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: BATCH MULTI-AD GENERATOR */}
      {activeTab === "generator" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Batch Listing Generator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste or write multiple business entries to generate structured directory ads. Listings without valid phone numbers will be automatically skipped.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Default Province</label>
              <select
                value={batchProvince}
                onChange={(e) => setBatchProvince(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white text-slate-800 font-semibold cursor-pointer"
              >
                {SA_PROVINCES.map(p => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Default Category</label>
              <select
                value={batchCategory}
                onChange={(e) => setBatchCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:bg-white text-slate-800 font-semibold cursor-pointer"
              >
                {CATEGORIES_STRUCTURED.map(g => (
                  <optgroup key={g.name} label={g.name}>
                    {g.subcategories.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Listings Data (Format: Business Name | City | Phone | Category | Address)
            </label>
            <textarea
              rows={6}
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder={`Cape Auto Works | Cape Town | 021 555 1234 | Auto Repairs & Mechanics | 12 Loop Street
Gauteng Solar Tech | Johannesburg | 011 452 9876 | Solar Power Installers | 44 Main Rd
Durban Plumber 24/7 | Durban | 031 201 8899 | Plumbers | 8 West Street`}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExecuteBatchCreate}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Provision Batch Listings
            </button>
          </div>
        </div>
      )}

      {/* VIEW 4: ALL ADS TABLE */}
      {activeTab === "all_ads" && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">All Live Advertisements ({ads.length})</h3>
            <span className="text-xs text-slate-500">Sorted by creation date</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ads.slice(0, 50).map((ad, idx) => (
                  <tr key={ad.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{ad.title}</td>
                    <td className="py-2.5 px-3 text-slate-600">{ad.category}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {ad.phone || <span className="text-rose-500 font-normal italic">No phone</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{ad.location || ad.city}, {ad.province}</td>
                    <td className="py-2.5 px-3">
                      {ad.verified ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Verified</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">Unclaimed</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onViewAd(ad)} className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingAd(ad)} className="text-indigo-600 hover:text-indigo-900 p-1 cursor-pointer">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSingleAd(ad.id)} className="text-rose-600 hover:text-rose-900 p-1 cursor-pointer">
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
      )}

      {/* MERGE CLUSTER MODAL */}
      {mergingCluster && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Merge Duplicate Copies</h3>
              </div>
              <button onClick={() => setMergingCluster(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select which listing to use as the <strong>Master Record</strong>. High-value details (phone, website, description, verified badge) from the other copies will be retained in this master ad, and redundant duplicates will be deleted.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {mergingCluster.ads.map(ad => (
                <label
                  key={ad.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    masterAdIdForMerge === ad.id
                      ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="masterSelect"
                    checked={masterAdIdForMerge === ad.id}
                    onChange={() => setMasterAdIdForMerge(ad.id)}
                    className="mt-1 text-emerald-600"
                  />
                  <div className="text-xs flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ad.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{ad.id}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Phone: <strong>{ad.phone || "None"}</strong> • Location: <strong>{ad.location || ad.city}</strong>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setMergingCluster(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteMerge}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <GitMerge className="w-3.5 h-3.5" /> Confirm & Execute Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SINGLE AD MODAL */}
      {editingAd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-600" /> Edit Listing
              </h3>
              <button onClick={() => setEditingAd(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Business Name</label>
                <input
                  type="text"
                  value={editingAd.title || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingAd.phone || ""}
                    onChange={(e) => setEditingAd({ ...editingAd, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white font-mono"
                    placeholder="e.g. 011 452 1234"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={editingAd.category || ""}
                    onChange={(e) => setEditingAd({ ...editingAd, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={editingAd.address || ""}
                  onChange={(e) => setEditingAd({ ...editingAd, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">City / Town</label>
                  <input
                    type="text"
                    value={editingAd.city || editingAd.location || ""}
                    onChange={(e) => setEditingAd({ ...editingAd, city: e.target.value, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Province</label>
                  <select
                    value={editingAd.province || "gauteng"}
                    onChange={(e) => setEditingAd({ ...editingAd, province: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white cursor-pointer"
                  >
                    {SA_PROVINCES.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingAd(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditAd}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SINGLE AD MODAL */}
      {isCreatingSingleAd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Create Single Ad
              </h3>
              <button onClick={() => setIsCreatingSingleAd(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Solar Solutions"
                  value={newAdForm.title}
                  onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 011 789 4321"
                    value={newAdForm.phone}
                    onChange={(e) => setNewAdForm({ ...newAdForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={newAdForm.category}
                    onChange={(e) => setNewAdForm({ ...newAdForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white cursor-pointer"
                  >
                    {CATEGORIES_STRUCTURED.map(g => (
                      <optgroup key={g.name} label={g.name}>
                        {g.subcategories.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Main Road"
                  value={newAdForm.address}
                  onChange={(e) => setNewAdForm({ ...newAdForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Johannesburg"
                    value={newAdForm.city}
                    onChange={(e) => setNewAdForm({ ...newAdForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Province</label>
                  <select
                    value={newAdForm.province}
                    onChange={(e) => setNewAdForm({ ...newAdForm, province: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:bg-white cursor-pointer"
                  >
                    {SA_PROVINCES.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCreatingSingleAd(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSingleAd}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Create Listing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
