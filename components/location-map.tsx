"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./map-component"), { ssr: false });

interface LocationMapProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
}

export default function LocationMap({ address, lat, lng }: LocationMapProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapComponent address={address} lat={lat} lng={lng} />
    </div>
  );
}
