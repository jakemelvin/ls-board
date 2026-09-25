'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { divIcon, type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import type { GeoCoordinates, PlatformCollectionPointSearchResponse } from '@/lib/collection-points-map/types';

type PointScope = 'COMPANY' | 'NETWORK';

type CollectionPointsGeographicMapProps = {
  points: PlatformCollectionPointSearchResponse[];
  userLocation: GeoCoordinates | null;
  selectedPointKey: string | null;
  getScope: (item: PlatformCollectionPointSearchResponse) => PointScope;
  onSelect: (key: string) => void;
};

type GeocodingResult = { lat: string; lon: string };

const DEFAULT_CENTER: LatLngExpression = [4.0511, 9.7679];
const DEFAULT_ZOOM = 12;
const TILE_SOURCES = [
  `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY ?? ''}`,
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
] as const;
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function pointKey(item: PlatformCollectionPointSearchResponse) {
  return `${item.companyId}:${item.collectionPoint.id}`;
}

function coordinatesOf(item: PlatformCollectionPointSearchResponse): GeoCoordinates | null {
  const { latitude, longitude } = item.collectionPoint;
  return typeof latitude === 'number' && Number.isFinite(latitude) && typeof longitude === 'number' && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

function markerIcon(scope: PointScope, selected: boolean) {
  const color = scope === 'COMPANY' ? '#0ea5e9' : '#f97316';
  const ring = selected ? 'box-shadow: 0 0 0 5px rgba(3, 105, 161, .25); transform: scale(1.16);' : '';
  return divIcon({
    className: 'sendam-geographic-map-marker',
    html: `<span style="display:block;width:30px;height:30px;border:3px solid #fff;border-radius:9999px;background:${color};box-shadow:0 2px 8px rgba(0,0,0,.35);${ring}"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const USER_ICON = divIcon({
  className: 'sendam-geographic-map-user-marker',
  html: '<span style="display:block;width:22px;height:22px;border:4px solid #fff;border-radius:9999px;background:#eab308;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapViewport({ points, userLocation, selectedCoordinates }: Pick<CollectionPointsGeographicMapProps, 'points' | 'userLocation'> & { selectedCoordinates: GeoCoordinates | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoordinates) {
      map.setView([selectedCoordinates.latitude, selectedCoordinates.longitude], 16, { animate: false });
      return;
    }

    const coordinates = points.flatMap((point) => {
      const value = coordinatesOf(point);
      return value ? [[value.latitude, value.longitude] as LatLngExpression] : [];
    });
    if (userLocation) coordinates.push([userLocation.latitude, userLocation.longitude]);
    if (coordinates.length === 1) map.setView(coordinates[0], 15, { animate: false });
    else if (coordinates.length > 1) map.fitBounds(coordinates as LatLngBoundsExpression, { padding: [36, 36], maxZoom: 15, animate: false });
    else map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
  }, [map, points, selectedCoordinates, userLocation]);

  useEffect(() => {
    const container = map.getContainer();
    const frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [map]);
  return null;
}

export default function CollectionPointsGeographicMap({ points, userLocation, selectedPointKey, getScope, onSelect }: CollectionPointsGeographicMapProps) {
  const [tileSourceIndex, setTileSourceIndex] = useState(0);
  const [geocodedSelectedCoordinates, setGeocodedSelectedCoordinates] = useState<GeoCoordinates | null>(null);
  const selectedPoint = selectedPointKey ? points.find((point) => pointKey(point) === selectedPointKey) ?? null : null;
  const selectedCoordinates = selectedPoint ? coordinatesOf(selectedPoint) : null;
  const positionedPoints = useMemo(() => points.flatMap((point) => {
    const coordinates = coordinatesOf(point);
    return coordinates ? [{ point, coordinates }] : [];
  }), [points]);
  const mapSelectedCoordinates = selectedCoordinates ?? geocodedSelectedCoordinates;
  const tileUrl = TILE_SOURCES[tileSourceIndex];
  const mapKey = useMemo(
    () => points.map((point) => {
      const coordinates = coordinatesOf(point);
      return `${pointKey(point)}:${coordinates?.latitude ?? ''}:${coordinates?.longitude ?? ''}`;
    }).join('|') || 'empty',
    [points],
  );

  useEffect(() => {
    setGeocodedSelectedCoordinates(null);
    if (!selectedPoint || selectedCoordinates) return;

    const abortController = new AbortController();
    const query = [selectedPoint.collectionPoint.address, selectedPoint.collectionPoint.city.cityName]
      .filter(Boolean)
      .join(', ');

    void fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
      signal: abortController.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<GeocodingResult[]> : [])
      .then((results) => {
        const result = results[0];
        const latitude = Number(result?.lat);
        const longitude = Number(result?.lon);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setGeocodedSelectedCoordinates({ latitude, longitude });
        }
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') setGeocodedSelectedCoordinates(null);
      });

    return () => abortController.abort();
  }, [selectedCoordinates, selectedPoint]);

  return (
    <MapContainer key={mapKey} center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        key={tileUrl}
        url={tileUrl}
        eventHandlers={{
          tileerror: () => setTileSourceIndex((index) => Math.min(index + 1, TILE_SOURCES.length - 1)),
        }}
      />
      <MapViewport points={points} userLocation={userLocation} selectedCoordinates={mapSelectedCoordinates} />
      {positionedPoints.map(({ point, coordinates }) => {
        const key = pointKey(point);
        return <Marker key={key} position={[coordinates.latitude, coordinates.longitude]} icon={markerIcon(getScope(point), key === selectedPointKey)} eventHandlers={{ click: () => onSelect(key) }} />;
      })}
      {selectedPoint && !selectedCoordinates && geocodedSelectedCoordinates && (
        <Marker
          position={[geocodedSelectedCoordinates.latitude, geocodedSelectedCoordinates.longitude]}
          icon={markerIcon(getScope(selectedPoint), true)}
        />
      )}
      {userLocation && <Marker position={[userLocation.latitude, userLocation.longitude]} icon={USER_ICON} />}
    </MapContainer>
  );
}
