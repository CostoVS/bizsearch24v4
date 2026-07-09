"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
}

// Generates search query variations for maximum geocoding success in South Africa
function getQueryCandidates(addr: string): string[] {
  const candidates: string[] = [];
  
  const trimmedOriginal = addr.trim();
  if (trimmedOriginal) {
    candidates.push(trimmedOriginal);
  }

  const cleanTerm = (term: string) => {
    return term
      .replace(/\([^)]*\)/g, "") // Remove parentheses and original text inside them
      .replace(/–/g, " ") // Replace dashes
      .replace(/-+/g, " ") // Replace hyphens
      .replace(/\b(proper|street|po\s*box|ext\s*\d+|extension\s*\d+|industrial|industria)\b/gi, "") // Remove common search-confusing words
      .replace(/["']+/g, "") // Remove double/single quotes
      .replace(/\s+/g, " ") // Clean multiple spaces
      .trim();
  };

  // Split the address into logical parts
  const parts = addr.split(",").map(p => p.trim());
  const cleanParts = parts.map(p => cleanTerm(p)).filter(Boolean);

  // 1. Cleaned full address
  if (cleanParts.length > 0) {
    const cleanedFull = cleanParts.join(", ");
    if (!candidates.includes(cleanedFull)) {
      candidates.push(cleanedFull);
    }
  }

  // 2. Suburb + Province + South Africa (skip Town, in case indexed under province/metro directly)
  if (cleanParts.length >= 4) {
    const subProvCountry = [cleanParts[0], cleanParts[2], cleanParts[3]].filter(Boolean).join(", ");
    if (!candidates.includes(subProvCountry)) {
      candidates.push(subProvCountry);
    }
  }

  // 3. Suburb + Town + South Africa (skip Province)
  if (cleanParts.length >= 4) {
    const subTownCountry = [cleanParts[0], cleanParts[1], cleanParts[3]].filter(Boolean).join(", ");
    if (!candidates.includes(subTownCountry)) {
      candidates.push(subTownCountry);
    }
  }

  // 4. Suburb + South Africa
  if (cleanParts.length >= 3) {
    const subCountry = [cleanParts[0], cleanParts[cleanParts.length - 1]].filter(Boolean).join(", ");
    if (!candidates.includes(subCountry)) {
      candidates.push(subCountry);
    }
  }

  // 5. Fallback to Town + Province + South Africa
  if (cleanParts.length >= 3) {
    const townIndex = cleanParts.length - 3;
    if (townIndex >= 0) {
      const townProvCountry = cleanParts.slice(townIndex).join(", ");
      if (!candidates.includes(townProvCountry)) {
        candidates.push(townProvCountry);
      }
    }
  }

  // 6. Province + South Africa fallback
  const provinceMatch = addr.match(/(KwaZulu-Natal|Eastern Cape|Western Cape|Gauteng|Free State|Limpopo|Mpumalanga|North West|Northern Cape)/i);
  if (provinceMatch) {
    const provFallback = `${provinceMatch[1]}, South Africa`;
    if (!candidates.includes(provFallback)) {
      candidates.push(provFallback);
    }
  }

  // 7. Country fallback as a final fail-safe
  const countryFallback = "South Africa";
  if (!candidates.includes(countryFallback)) {
    candidates.push(countryFallback);
  }
  
  return candidates;
}

export default function MapComponent({ address, lat, lng }: MapComponentProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat !== undefined && lat !== null && lng !== undefined && lng !== null ? [lat, lng] : null
  );
  const [loading, setLoading] = useState(
    lat !== undefined && lat !== null && lng !== undefined && lng !== null ? false : true
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
      return;
    }
    
    // Use Nominatim API for open source geocoding with multi-candidate backup retries restricted strictly to ZA
    const fetchCoordinates = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const candidates = getQueryCandidates(address);
        let foundPosition: [number, number] | null = null;
        
        for (const query of candidates) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za`);
            if (!res.ok) continue;
            
            const data = await res.json();
            if (data && data.length > 0 && data[0].lat && data[0].lon) {
              foundPosition = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              break;
            }
          } catch (e) {
            console.warn(`Geocoding candidate "${query}" lookup failed:`, e);
          }
        }
        
        if (isMounted) {
          if (foundPosition) {
            setPosition(foundPosition);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchCoordinates();

    return () => {
      isMounted = false;
    };
  }, [address, lat, lng]);

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-medium">Loading Map...</div>;
  }

  if (error || !position) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-medium">Could not locate address on map.</div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 w-full relative z-0 min-h-0">
        <MapContainer center={position} zoom={14} scrollWheelZoom={false} className="w-full h-full z-0 font-sans">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              {address}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      
      {/* Coordinates Info Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2 rounded-b-2xl">
        <div className="flex items-center gap-1.5 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700">South Africa Geolocation Desk:</span>
        </div>
        <div className="flex items-center gap-4 text-emerald-800">
          <span className="bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded">
            Latitude: <strong className="font-bold font-mono">{position[0].toFixed(6)}</strong>
          </span>
          <span className="bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded">
            Longitude: <strong className="font-bold font-mono">{position[1].toFixed(6)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
