import { useEffect, useRef } from "react";

type Props = {
  lat: number;
  lng: number;
  name: string;
  editable?: boolean;
  onChange?: (lat: number, lng: number) => void;
};

export default function RestaurantMap({ lat, lng, name, editable = false, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

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
      const marker = L.marker([lat, lng], { icon, draggable: editable }).addTo(map).bindPopup(name);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current?.(p.lat, p.lng);
      });

      if (editable) {
        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }

      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker draggability + position when props change
  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    if (editable) marker.dragging?.enable();
    else marker.dragging?.disable();
    const cur = marker.getLatLng();
    if (cur.lat !== lat || cur.lng !== lng) {
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
    }
  }, [lat, lng, editable]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-2xl border border-border"
      style={{ background: "hsl(var(--surface))" }}
    />
  );
}
