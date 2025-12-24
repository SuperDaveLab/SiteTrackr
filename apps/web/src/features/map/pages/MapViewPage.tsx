import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngBounds, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import './MapViewPage.css';
import { fetchMapMarkers, MapMarker } from '../api/mapApi';
import { fetchTemplates } from '../../templates/api/templatesApi';
import { listSiteOwners, type SiteOwner } from '../../siteOwners/api/siteOwnersApi';

let leafletIconsInitialized = false;
const ensureLeafletIcons = () => {
  if (leafletIconsInitialized) {
    return;
  }

  // Force Leaflet to use bundled marker assets instead of looking in the default image path.
  // Without removing _getIconUrl, browsers attempt to load marker icons from /node_modules/... and show broken images.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow
  });
  leafletIconsInitialized = true;
};

ensureLeafletIcons();

const DEFAULT_CENTER: [number, number] = [39.5, -98.35];
const DEFAULT_ZOOM = 4;

const precision = (value: number) => Number(value.toFixed(5));
const toBoundsTuple = (bounds: LatLngBounds): [number, number, number, number] => {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return [precision(southWest.lng), precision(southWest.lat), precision(northEast.lng), precision(northEast.lat)];
};

const boundsEqual = (
  a: [number, number, number, number] | null,
  b: [number, number, number, number]
): boolean => !!a && a.every((value, index) => value === b[index]);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPopupHtml = (marker: MapMarker) => {
  const code = marker.siteCode ? `[${escapeHtml(marker.siteCode)}]` : '';
  const owner = marker.siteOwnerName ? escapeHtml(marker.siteOwnerName) : 'Unassigned owner';
  const templateBadges = marker.templates.length > 0
    ? marker.templates.map((tpl) => `<span class="popup-pill">${escapeHtml(tpl)}</span>`).join(' ')
    : '<span class="popup-pill muted">No templates</span>';
  const ticketsLinkSearch = marker.siteCode ?? marker.siteName;

  return `
    <div class="marker-popup">
      <h3>${escapeHtml(marker.siteName)} <span>${code}</span></h3>
      <div class="popup-meta">${owner}</div>
      <div class="popup-meta"><strong>${marker.openTicketCount}</strong> open ticket${marker.openTicketCount === 1 ? '' : 's'}</div>
      <div class="popup-templates">${templateBadges}</div>
      <div class="popup-links">
        <a href="/sites/${marker.siteId}" target="_blank" rel="noopener noreferrer">Site</a>
        <a href="/tickets?search=${encodeURIComponent(ticketsLinkSearch)}" target="_blank" rel="noopener noreferrer">Tickets</a>
      </div>
    </div>
  `;
};

const MapBoundsWatcher = ({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) => {
  const map = useMap();

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds())
  });

  return null;
};

const MarkerClusterLayer = ({
  markers,
  pinnedSiteId,
  onPinChange
}: {
  markers: MapMarker[];
  pinnedSiteId: string | null;
  onPinChange: (siteId: string | null) => void;
}) => {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const pinnedRef = useRef<string | null>(null);

  useEffect(() => {
    pinnedRef.current = pinnedSiteId;
  }, [pinnedSiteId]);

  useEffect(() => {
    const handleMapClick = () => {
      if (pinnedRef.current !== null) {
        onPinChange(null);
      }
    };
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onPinChange]);

  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 18
      });
      map.addLayer(clusterGroupRef.current);
    }

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();
    markerMapRef.current.clear();

    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng]);
      leafletMarker.bindPopup(buildPopupHtml(marker));
      leafletMarker.on('mouseover', () => {
        if (pinnedRef.current !== marker.siteId) {
          leafletMarker.openPopup();
        }
      });
      leafletMarker.on('mouseout', () => {
        if (pinnedRef.current !== marker.siteId) {
          leafletMarker.closePopup();
        }
      });
      leafletMarker.on('click', (event: LeafletMouseEvent) => {
        event.originalEvent?.stopPropagation();
        onPinChange(marker.siteId);
      });
      clusterGroup.addLayer(leafletMarker);
      markerMapRef.current.set(marker.siteId, leafletMarker);
    });

    return () => {
      clusterGroup.clearLayers();
      markerMapRef.current.clear();
    };
  }, [map, markers, onPinChange]);

  useEffect(() => {
    if (!clusterGroupRef.current) {
      return;
    }

    if (!pinnedSiteId) {
      markerMapRef.current.forEach((leafletMarker) => leafletMarker.closePopup());
      return;
    }

    markerMapRef.current.forEach((leafletMarker, siteId) => {
      if (siteId !== pinnedSiteId) {
        leafletMarker.closePopup();
      }
    });

    const targetMarker = markerMapRef.current.get(pinnedSiteId);
    if (targetMarker) {
      const clusterGroup = clusterGroupRef.current;
      if (clusterGroup) {
        // zoomToShowLayer is provided by the marker-cluster plugin; cast to any to satisfy TS.
        (clusterGroup as unknown as { zoomToShowLayer: (layer: L.Layer, cb?: () => void) => void }).zoomToShowLayer(
          targetMarker,
          () => targetMarker.openPopup()
        );
      } else {
        targetMarker.openPopup();
      }
    }
  }, [pinnedSiteId]);

  useEffect(() => {
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export const MapViewPage = () => {
  const [selectedTemplateCodes, setSelectedTemplateCodes] = useState<string[]>([]);
  const [selectedSiteOwnerIds, setSelectedSiteOwnerIds] = useState<string[]>([]);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [pinnedSiteId, setPinnedSiteId] = useState<string | null>(null);
  const debounceRef = useRef<number>();

  const handleBoundsChange = useCallback((leafletBounds: LatLngBounds) => {
    const normalized = toBoundsTuple(leafletBounds);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setBounds((current) => (boundsEqual(current, normalized) ? current : normalized));
    }, 300);
  }, []);

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  const templateQuery = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });

  const siteOwnerQuery = useQuery({
    queryKey: ['siteOwners'],
    queryFn: listSiteOwners
  });

  const markerQuery = useQuery({
    queryKey: ['mapMarkers', { bounds, selectedTemplateCodes, selectedSiteOwnerIds }],
    queryFn: () =>
      fetchMapMarkers({
        bbox: bounds ?? undefined,
        templateCodes: selectedTemplateCodes,
        siteOwnerIds: selectedSiteOwnerIds
      }),
    enabled: !!bounds,
    staleTime: 10_000
  });

  const templates = useMemo(() => {
    const data = templateQuery.data ?? [];
    return [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [templateQuery.data]);

  const siteOwners = useMemo(() => {
    const data = siteOwnerQuery.data ?? [];
    return [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [siteOwnerQuery.data]);

  const markers = markerQuery.data ?? [];
  const isLoadingMarkers = markerQuery.isFetching || markerQuery.isLoading;

  useEffect(() => {
    if (pinnedSiteId && !markers.some((marker) => marker.siteId === pinnedSiteId)) {
      setPinnedSiteId(null);
    }
  }, [markers, pinnedSiteId]);

  const toggleTemplate = (code: string) => {
    setSelectedTemplateCodes((current) =>
      current.includes(code) ? current.filter((value) => value !== code) : [...current, code]
    );
  };

  const toggleSiteOwner = (id: string) => {
    setSelectedSiteOwnerIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const clearFilters = () => {
    setSelectedTemplateCodes([]);
    setSelectedSiteOwnerIds([]);
  };

  const templateSummary = selectedTemplateCodes.length > 0
    ? `${selectedTemplateCodes.length} template${selectedTemplateCodes.length === 1 ? '' : 's'}`
    : 'All templates';

  const ownerSummary = selectedSiteOwnerIds.length > 0
    ? `${selectedSiteOwnerIds.length} owner${selectedSiteOwnerIds.length === 1 ? '' : 's'}`
    : 'All site owners';

  const showEmptyState = !isLoadingMarkers && markers.length === 0;

  return (
    <div className="map-view-page">
      <div className="map-view-header">
        <div>
          <h1>Map View</h1>
          <div className="map-view-summary">
            <span className="map-view-chip">Pins: {markers.length}</span>
            <span className="map-view-chip">{templateSummary}</span>
            <span className="map-view-chip">{ownerSummary}</span>
          </div>
        </div>
      </div>

      <div className="map-view-layout">
        <aside className="map-filter-panel">
          <h2>Filters</h2>

          <div className="map-filter-group">
            <div className="map-filter-label">Ticket Templates</div>
            {templateQuery.isLoading && <p>Loading templates…</p>}
            {!templateQuery.isLoading && templates.length === 0 && (
              <p style={{ opacity: 0.8 }}>No templates available.</p>
            )}
            {templates.length > 0 && (
              <div className="map-filter-scroll">
                {templates.map((template) => (
                  <label key={template.id} className="map-filter-option">
                    <input
                      type="checkbox"
                      checked={selectedTemplateCodes.includes(template.code)}
                      onChange={() => toggleTemplate(template.code)}
                    />
                    <span>
                      <strong>{template.name}</strong>
                      <br />
                      <span style={{ opacity: 0.7 }}>Code: {template.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="map-filter-group">
            <div className="map-filter-label">Site Owners</div>
            {siteOwnerQuery.isLoading && <p>Loading owners…</p>}
            {!siteOwnerQuery.isLoading && siteOwners.length === 0 && (
              <p style={{ opacity: 0.8 }}>No site owners found.</p>
            )}
            {siteOwners.length > 0 && (
              <div className="map-filter-scroll">
                {siteOwners.map((owner: SiteOwner) => (
                  <label key={owner.id} className="map-filter-option">
                    <input
                      type="checkbox"
                      checked={selectedSiteOwnerIds.includes(owner.id)}
                      onChange={() => toggleSiteOwner(owner.id)}
                    />
                    <span>
                      <strong>{owner.name}</strong>
                      <br />
                      <span style={{ opacity: 0.7 }}>Code: {owner.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="map-filter-actions">
            <button
              type="button"
              className="map-filter-button secondary"
              onClick={() => markerQuery.refetch()}
            >
              Refresh Data
            </button>
            <button
              type="button"
              className="map-filter-button primary"
              onClick={clearFilters}
              disabled={selectedTemplateCodes.length === 0 && selectedSiteOwnerIds.length === 0}
            >
              Clear Filters
            </button>
          </div>
        </aside>

        <section className="map-view-map">
          {isLoadingMarkers && (
            <div className="map-loading-indicator">
              <span role="img" aria-hidden="true">🛰️</span>
              Updating pins…
            </div>
          )}
          {markerQuery.isError && (
            <div className="map-error-banner">
              Failed to load markers: {markerQuery.error instanceof Error ? markerQuery.error.message : 'Unknown error'}
            </div>
          )}
          {showEmptyState && <div className="map-empty-note">No matching sites in this viewport.</div>}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsWatcher onBoundsChange={handleBoundsChange} />
            {markers.length > 0 && (
              <MarkerClusterLayer
                markers={markers}
                pinnedSiteId={pinnedSiteId}
                onPinChange={setPinnedSiteId}
              />
            )}
          </MapContainer>
        </section>
      </div>
    </div>
  );
};
