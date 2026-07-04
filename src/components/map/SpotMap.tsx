"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { formatDate } from "@/lib/utils";
import type { DateSpotWithPhoto } from "@/types/domain";

/** Kirov city center. */
export const KIROV_CENTER: [number, number] = [58.6035, 49.668];

const heartIcon = L.divIcon({
  className: "",
  html: `<div style="
      width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.92); border-radius: 50% 50% 50% 4px;
      box-shadow: 0 10px 24px -10px rgba(236, 95, 156, 0.75); border: 2px solid rgba(236, 95, 156, 0.55);
      transform: rotate(-45deg);
    "><span style="transform: rotate(45deg); font-size: 18px; line-height: 1;">\u2764\ufe0f</span></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -34]
});

const draftIcon = L.divIcon({
  className: "",
  html: `<div style="
      width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
      background: rgba(236, 95, 156, 0.9); border-radius: 50% 50% 50% 4px;
      box-shadow: 0 10px 24px -10px rgba(236, 95, 156, 0.9); border: 2px solid #fff;
      transform: rotate(-45deg);
    "><span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">\u2795</span></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -34]
});

function ClickCatcher({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick?.(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

export type SpotMapProps = {
  spots: DateSpotWithPhoto[];
  /** When set, map clicks report coordinates (admin "add point" mode). */
  onPick?: (lat: number, lng: number) => void;
  draft?: { lat: number; lng: number } | null;
  onEdit?: (spot: DateSpotWithPhoto) => void;
  onDelete?: (spot: DateSpotWithPhoto) => void;
  isAdmin?: boolean;
};

export default function SpotMap({ spots, onPick, draft, onEdit, onDelete, isAdmin }: SpotMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (spots.length === 0) return KIROV_CENTER;
    const lat = spots.reduce((sum, spot) => sum + spot.lat, 0) / spots.length;
    const lng = spots.reduce((sum, spot) => sum + spot.lng, 0) / spots.length;
    return [lat, lng];
  }, [spots]);

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full" style={{ minHeight: 480 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickCatcher onPick={onPick} />

      {draft ? <Marker position={[draft.lat, draft.lng]} icon={draftIcon} /> : null}

      {spots.map((spot) => (
        <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={heartIcon}>
          <Popup maxWidth={280} minWidth={220}>
            <div style={{ fontFamily: "inherit" }}>
              {spot.photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spot.photoSrc}
                  alt={spot.title}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 14, marginBottom: 8 }}
                />
              ) : null}
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#6b5563" }}>{spot.title}</p>
              {spot.spot_date ? (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#a58a99" }}>{formatDate(spot.spot_date)}</p>
              ) : null}
              <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: "#6b5563" }}>{spot.body}</p>
              {isAdmin ? (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => onEdit?.(spot)}
                    style={{
                      flex: 1,
                      border: "1px solid rgba(236,95,156,0.4)",
                      background: "#fff",
                      color: "#ec5f9c",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(spot)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "rgba(236,95,156,0.12)",
                      color: "#c2426f",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Удалить
                  </button>
                </div>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
