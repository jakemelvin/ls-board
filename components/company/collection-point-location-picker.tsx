'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';
import { useTranslation } from '@/lib/i18n';

type Coordinates = { latitude: number; longitude: number };

type CollectionPointLocationPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (coordinates: Coordinates) => void;
};

/** Douala, the main operating market, is only used until a position is chosen. */
const DEFAULT_CENTER: LatLngExpression = [4.0511, 9.7679];
const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 16;

type UserAdjustedRef = { current: boolean };

/**
 * Leaflet resolves its default marker images relative to the page in a bundler,
 * which gives a 404 and an invisible pin. Draw the marker instead so it always
 * renders and follows the theme tokens.
 */
const MARKER_ICON = divIcon({
  className: 'sendam-map-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44" aria-hidden="true" focusable="false">
    <path d="M16 42.4c6.4-6.8 12.4-13.6 12.4-21.1C28.4 10.9 22.9 5.6 16 5.6S3.6 10.9 3.6 21.3c0 7.5 6 14.3 12.4 21.1Z" fill="var(--primary)" stroke="var(--primary-foreground)" stroke-width="2.4" stroke-linejoin="round" />
    <circle cx="16" cy="21" r="5.4" fill="var(--primary-foreground)" />
  </svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 42],
});

function parseCoordinates(latitude: string, longitude: string): Coordinates | undefined {
  const rawLatitude = latitude.trim();
  const rawLongitude = longitude.trim();

  // Empty inputs must stay empty: `Number('')` is 0, which used to place the
  // point at the (0, 0) coordinates in the Atlantic Ocean.
  if (rawLatitude === '' || rawLongitude === '') {
    return undefined;
  }

  const parsedLatitude = Number(rawLatitude);
  const parsedLongitude = Number(rawLongitude);

  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90 ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    return undefined;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

function MapClickHandler({
  onChange,
  userAdjustedRef,
}: Pick<CollectionPointLocationPickerProps, 'onChange'> & { userAdjustedRef: UserAdjustedRef }) {
  useMapEvents({
    click(event) {
      userAdjustedRef.current = true;
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function MapViewport({
  coordinates,
  userAdjustedRef,
}: {
  coordinates?: Coordinates;
  userAdjustedRef: UserAdjustedRef;
}) {
  const map = useMap();

  useEffect(() => {
    // Only follow a position that comes from outside the map (editing an existing
    // point). Recentring after a click would move the map under the cursor and the
    // marker would never land where the user clicked.
    if (userAdjustedRef.current || !coordinates) {
      return;
    }

    map.setView([coordinates.latitude, coordinates.longitude], SELECTED_ZOOM, { animate: false });
  }, [coordinates, map, userAdjustedRef]);

  useEffect(() => {
    // The dialog animates open, so Leaflet's first measurement of the container is
    // wrong and the tiles end up cropped. Keep the map size in sync instead.
    const container = map.getContainer();
    const frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export default function CollectionPointLocationPicker({
  latitude,
  longitude,
  onChange,
}: CollectionPointLocationPickerProps) {
  const { t } = useTranslation('dashboard');
  const userAdjustedRef = useRef(false);

  const coordinates = useMemo(() => parseCoordinates(latitude, longitude), [latitude, longitude]);

  const center: LatLngExpression = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : DEFAULT_CENTER;

  return (
    <section className="space-y-2" aria-labelledby="location-picker-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h3 id="location-picker-title" className="text-sm font-medium text-foreground">
            {t('collectionPointsManagement.locationPicker.title')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('collectionPointsManagement.locationPicker.description')}
          </p>
        </div>
        <p className="text-xs font-medium text-primary" aria-live="polite">
          {coordinates
            ? t('collectionPointsManagement.locationPicker.selected')
            : t('collectionPointsManagement.locationPicker.notSelected')}
        </p>
      </div>

      <div className="h-56 overflow-hidden rounded-xl border border-border bg-secondary sm:h-64">
        <MapContainer
          center={center}
          zoom={coordinates ? SELECTED_ZOOM : DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={onChange} userAdjustedRef={userAdjustedRef} />
          <MapViewport coordinates={coordinates} userAdjustedRef={userAdjustedRef} />
          {coordinates && (
            <Marker position={[coordinates.latitude, coordinates.longitude]} icon={MARKER_ICON} />
          )}
        </MapContainer>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {coordinates
          ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
          : t('collectionPointsManagement.locationPicker.coordinatesEmpty')}
      </p>
    </section>
  );
}
