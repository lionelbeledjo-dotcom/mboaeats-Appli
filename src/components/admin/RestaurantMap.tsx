import { useEffect, useRef } from "react";

type Props = { lat: number; lng: number; name: string };

export default function RestaurantMap({ lat, lng, name }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 16,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:hsl(var(--primary,12 90% 55%));transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.4);border:2px solid white;"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(name);

      // Force resize after modal animation
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, name]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-2xl border border-border"
      style={{ background: "hsl(var(--surface))" }}
    />
  );
}
