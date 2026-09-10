import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CopyButton } from './CopyButton';

interface StopMapProps {
  lat: number;
  long: number;
  stopName: string;
  stopId: string;
  className?: string;
}

export const StopMap: React.FC<StopMapProps> = ({
  lat,
  long,
  stopName,
  stopId,
  className = 'h-64 w-full rounded-xl overflow-hidden shadow-inner',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isNaN(lat) || isNaN(long)) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, long],
        zoom: 17,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom bus pin icon
      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: `
          <div style="
            background-color: #dc2626;
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
            border: 2px solid white;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4C2.9 6 1.9 6.8 1.6 7.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C.5 16.3 1 18 1 18h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="17" cy="18" r="2"></circle>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, long], { icon: busIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${stopName}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">STOP ID:</div>
          <code style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 12px; color: #0f172a;">${stopId}</code>
        </div>
      `).openPopup();

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, long], 17);
    }

    return () => {
      // Clean up map when unmounting
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, long, stopName, stopId]);

  return (
    <div className={`relative border border-slate-200 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute bottom-2 right-2 z-20 bg-white/90 backdrop-blur-xs px-2 py-1 rounded text-[11px] text-slate-500 font-mono shadow-xs pointer-events-none">
        {lat.toFixed(5)}, {long.toFixed(5)}
      </div>
    </div>
  );
};
