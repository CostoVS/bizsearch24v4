"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin } from "lucide-react";

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

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  city: string;
  province: string;
  onChange: (lat: number, lng: number) => void;
}

// Recenters map when coordinates change
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Listens to map clicks and moves pin
function MapClickHandler({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPicker({ lat, lng, city, province, onChange }: MapPickerProps) {
  const defaultCenter: [number, number] = [-29.0852, 26.1596]; // Center of South Africa
  const currentCenter: [number, number] = lat !== null && lng !== null ? [lat, lng] : defaultCenter;
  const currentZoom = lat !== null && lng !== null ? 14 : 6;

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Attempt to geocode based on city & province inputs on demand
  const handleGeocodeQuick = async (queryStr?: string) => {
    const searchTarget = queryStr || `${city}, ${province}, South Africa`;
    if (!city && !queryStr) return;

    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTarget)}&countrycodes=za`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        onChange(foundLat, foundLng);
      } else {
        setSearchError("No results found. Please set manually by clicking map.");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      setSearchError("Could not connect to geocoding services. Set manually via click.");
    } finally {
      setSearching(false);
    }
  };

  const currentPos: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" id="map-picker-container">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Dynamic Coordinate Pinpointer
          </p>
          <p className="text-[10px] text-slate-500 font-semibold">
            {currentPos ? (
              <span className="text-emerald-700 font-bold">Selected Match: {lat?.toFixed(5)}, {lng?.toFixed(5)}</span>
            ) : (
              "Click anywhere on map to pin custom page latitude / longitude"
            )}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleGeocodeQuick()}
            disabled={searching || !city}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            {searching ? "Geocoding..." : `🎯 Locate "${city || 'City'}"`}
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-50/50 border-b border-slate-150 flex items-center gap-2">
        <input
          type="text"
          placeholder="Search target suburb, address, or town specifically..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeQuick(searchQuery))}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/20 text-slate-900 font-medium"
        />
        <button
          type="button"
          onClick={() => handleGeocodeQuick(searchQuery)}
          disabled={searching || !searchQuery}
          className="p-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shrink-0 cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {searchError && (
        <p className="text-[10px] text-rose-500 font-bold px-4 py-1.5 bg-rose-50 border-b border-rose-100">{searchError}</p>
      )}

      <div className="w-full h-64 z-0 relative">
        <MapContainer center={currentCenter} zoom={currentZoom} scrollWheelZoom={true} className="w-full h-full z-0 font-sans">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {currentPos && (
            <Marker position={currentPos}>
              <Popup>
                <div className="text-xs text-slate-850">
                  <p className="font-bold">{city || "Custom Area Page"}</p>
                  <p className="text-[10px] text-slate-500">{lat?.toFixed(5)}, {lng?.toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}
          <MapCenterController center={currentCenter} />
          <MapClickHandler onLocationSelected={onChange} />
        </MapContainer>
      </div>
    </div>
  );
}
