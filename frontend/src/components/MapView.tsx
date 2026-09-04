import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useFloodStore } from "../state/FloodStore";
import { DEMO_CHENNAI_ROADS } from "../data/demoChennaiRoads";
import { DEMO_CHENNAI_INFRASTRUCTURE } from "../data/demoChennaiZones";
import { fetchLatestRadarTimestamp } from "../services/radarService";
import RoadInspectionCard from "./RoadInspectionCard";
import type { FloodCell, GeoJsonFeature, RoadSegment, RouteResponse, FeatureCollection } from "../types/api";

const CHENNAI_CENTER: [number, number] = [80.25, 13.045];
const DEFAULT_ZOOM = 12.8;
const GLOBE_CENTER: [number, number] = [55, 20];
const GLOBE_ZOOM = 1.8;

const EMPTY_COLLECTION: GeoJSON.GeoJSON = { type: "FeatureCollection", features: [] };

const RISK_COLORS = {
  safe: "#22c55e",
  watch: "#eab308",
  likely: "#f97316",
  severe: "#ef4444",
};

// ── MAPTILER CONFIGURATION VIA VITE ENV (NO HARDCODING, NO LOGGING) ──
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL;

const MAPTILER_DARK_STYLE =
  MAP_STYLE_URL ||
  (MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
    : undefined);

const MAPTILER_SATELLITE_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`
  : undefined;

const FALLBACK_DARK_STYLE = {
  version: 8 as const,
  sources: {
    "fallback-dark": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "fallback-dark-layer",
      type: "raster" as const,
      source: "fallback-dark",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const FALLBACK_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "fallback-satellite": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles &copy; Esri",
    },
  },
  layers: [
    {
      id: "fallback-satellite-layer",
      type: "raster" as const,
      source: "fallback-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function getBasemapStyle(type: "dark" | "satellite"): any {
  if (type === "satellite") {
    return MAPTILER_SATELLITE_STYLE || FALLBACK_SATELLITE_STYLE;
  }
  return MAPTILER_DARK_STYLE || FALLBACK_DARK_STYLE;
}

function featureCollection(features: GeoJsonFeature[] = []): GeoJSON.GeoJSON {
  return { type: "FeatureCollection", features } as unknown as GeoJSON.GeoJSON;
}

function floodFeatures(cells: FloodCell[] = []): GeoJsonFeature[] {
  return cells
    .filter((cell) => cell.geometry)
    .map((cell) => ({
      type: "Feature",
      geometry: cell.geometry!,
      properties: {
        cell_id: cell.cell_id,
        risk_level: cell.risk_level,
        depth_band: cell.depth_band,
        confidence: cell.confidence,
        primary_cause: cell.drivers?.primary_cause ?? "No elevated driver",
      },
    }));
}

function floodPointFeatures(cells: FloodCell[] = []): GeoJsonFeature[] {
  return cells
    .filter((cell) => cell.risk_level !== "safe")
    .map((cell) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [cell.centroid_lon, cell.centroid_lat],
      },
      properties: {
        cell_id: cell.cell_id,
        risk_level: cell.risk_level,
        depth_band: cell.depth_band,
        confidence: cell.confidence,
      },
    }));
}

function roadFeatures(roads: RoadSegment[] = []): GeoJsonFeature[] {
  const backendRoads = roads.map((road) => ({
    type: "Feature" as const,
    geometry: road.geometry,
    properties: {
      road_id: road.road_id,
      name: road.name,
      risk_level: road.risk_level,
      depth_band: road.depth_band ?? "0-10cm",
      passable: road.passable,
      status: road.passable ? (road.risk_level === "safe" ? "NORMAL" : "AFFECTED") : "IMPASSABLE",
    },
  }));

  const demoCorridors = DEMO_CHENNAI_ROADS.features.map((feat) => ({
    type: "Feature" as const,
    geometry: feat.geometry,
    properties: {
      road_id: feat.properties.id,
      name: feat.properties.name,
      risk_level: feat.properties.severity.toLowerCase(),
      depth_band: feat.properties.flood_depth,
      passable: feat.properties.passable,
      status: feat.properties.status,
    },
  }));

  return [...backendRoads, ...demoCorridors] as unknown as GeoJsonFeature[];
}

function criticalFeatures(critical?: FeatureCollection): GeoJsonFeature[] {
  const backendItems = (critical?.features ?? [])
    .filter((f) => (f.properties as any)?.type !== "Relief Center")
    .map((f) => ({
      type: "Feature" as const,
      geometry: f.geometry,
      properties: {
        id: (f.properties as any)?.infra_id ?? "infra",
        name: (f.properties as any)?.name ?? "Critical Node",
        type: (f.properties as any)?.type ?? "Hospital",
        category: ((f.properties as any)?.type ?? "HOSPITAL").toUpperCase(),
      },
    }));

  const demoItems = DEMO_CHENNAI_INFRASTRUCTURE.features
    .filter((f) => f.properties.category !== "SHELTER")
    .map((f) => ({
      type: "Feature" as const,
      geometry: f.geometry,
      properties: {
        id: f.properties.id,
        name: f.properties.name,
        type: f.properties.category === "HOSPITAL" ? "Hospital" : "Station",
        category: f.properties.category,
      },
    }));

  return [...backendItems, ...demoItems] as unknown as GeoJsonFeature[];
}

function reliefFeatures(critical?: FeatureCollection): GeoJsonFeature[] {
  const backendShelters = (critical?.features ?? [])
    .filter((f) => (f.properties as any)?.type === "Relief Center")
    .map((f) => ({
      type: "Feature" as const,
      geometry: f.geometry,
      properties: {
        id: (f.properties as any)?.infra_id ?? "relief",
        name: (f.properties as any)?.name ?? "Relief Center",
        type: "Relief Center",
        category: "SHELTER",
        capacity: "450 Persons",
      },
    }));

  const demoShelters = DEMO_CHENNAI_INFRASTRUCTURE.features
    .filter((f) => f.properties.category === "SHELTER")
    .map((f) => ({
      type: "Feature" as const,
      geometry: f.geometry,
      properties: {
        id: f.properties.id,
        name: f.properties.name,
        type: "Relief Center",
        category: "SHELTER",
        capacity: f.properties.capacity ?? "500 Persons",
      },
    }));

  return [...backendShelters, ...demoShelters] as unknown as GeoJsonFeature[];
}

function routeFeature(route: RouteResponse | undefined, key: "normal_route" | "flood_aware_route"): GeoJsonFeature[] {
  if (!route) return [];
  const path = route[key]?.path;
  const coordinates = path?.coordinates as unknown[];
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  return [
    {
      type: "Feature",
      geometry: path,
      properties: { kind: key === "normal_route" ? "Normal route" : "Flood-aware route" },
    },
  ];
}

function setSourceData(map: MapLibreMap, sourceId: string, data: unknown) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data as GeoJSON.GeoJSON);
  }
}

function popupHtml(cell: FloodCell, forecastLabel: string) {
  return `
    <div style="padding: 10px; font-family: ui-sans-serif, system-ui; font-size: 12px; color: #1e293b; min-width: 180px;">
      <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0284c7;">${cell.cell_id}</h3>
      <p style="margin: 2px 0;"><strong>Risk:</strong> <span style="font-weight: 700; text-transform: uppercase;">${cell.risk_level}</span></p>
      <p style="margin: 2px 0;"><strong>Depth band:</strong> ${cell.depth_band}</p>
      <p style="margin: 2px 0;"><strong>Likely cause:</strong> ${cell.drivers?.primary_cause ?? "Runoff accumulation"}</p>
      <p style="margin: 2px 0;"><strong>Forecast:</strong> ${forecastLabel}</p>
      <p style="margin: 2px 0;"><strong>Confidence:</strong> ${cell.confidence}</p>
    </div>
  `;
}

export default function MapView() {
  const {
    activeStep,
    drainage,
    pilotBoundary,
    criticalInfrastructure,
    layers,
    route,
    clickedCell,
    setClickedCell,
    setClickedRoad,
    basemap,
    setBasemap,
    locateTrigger,
    startupPhase,
    setStartupPhase,
    layerPanelOpen,
    setLayerPanelOpen,
  } = useFloodStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);

  // Fetch RainViewer radar timestamp
  useEffect(() => {
    fetchLatestRadarTimestamp().then((data) => {
      if (data) setRadarTimestamp(data.timestamp);
    });
  }, []);

  // Compute collections from store
  const floodCollection = useMemo(
    () => featureCollection(floodFeatures(activeStep?.flood_cells ?? [])),
    [activeStep?.flood_cells],
  );
  const floodPointCollection = useMemo(
    () => featureCollection(floodPointFeatures(activeStep?.flood_cells ?? [])),
    [activeStep?.flood_cells],
  );
  const roadCollection = useMemo(
    () => featureCollection(roadFeatures(activeStep?.affected_roads ?? [])),
    [activeStep?.affected_roads],
  );
  const criticalCollection = useMemo(
    () => featureCollection(criticalFeatures(criticalInfrastructure)),
    [criticalInfrastructure],
  );
  const reliefCollection = useMemo(
    () => featureCollection(reliefFeatures(criticalInfrastructure)),
    [criticalInfrastructure],
  );
  const normalRouteCollection = useMemo(
    () => featureCollection(routeFeature(route, "normal_route")),
    [route],
  );
  const awareRouteCollection = useMemo(
    () => featureCollection(routeFeature(route, "flood_aware_route")),
    [route],
  );
  const selectedCellCollection = useMemo(() => {
    if (!clickedCell?.geometry) return featureCollection([]);
    return featureCollection([
      {
        type: "Feature",
        geometry: clickedCell.geometry,
        properties: { cell_id: clickedCell.cell_id },
      },
    ]);
  }, [clickedCell]);

  const layersRef = useRef(layers);
  layersRef.current = layers;

  const dataRef = useRef({
    floodCollection,
    floodPointCollection,
    roadCollection,
    criticalCollection,
    reliefCollection,
    normalRouteCollection,
    awareRouteCollection,
    selectedCellCollection,
    drainage,
    pilotBoundary,
  });
  dataRef.current = {
    floodCollection,
    floodPointCollection,
    roadCollection,
    criticalCollection,
    reliefCollection,
    normalRouteCollection,
    awareRouteCollection,
    selectedCellCollection,
    drainage,
    pilotBoundary,
  };

  // ── Helper 1: Ensure Custom Sources Exist ──
  const ensureCustomSources = useCallback((map: MapLibreMap) => {
    if (!map.getSource("flood")) {
      map.addSource("flood", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("flood-points")) {
      map.addSource("flood-points", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("roads")) {
      map.addSource("roads", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("drainage")) {
      map.addSource("drainage", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("critical")) {
      map.addSource("critical", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("relief")) {
      map.addSource("relief", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("route-normal")) {
      map.addSource("route-normal", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("route-aware")) {
      map.addSource("route-aware", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("selected-cell")) {
      map.addSource("selected-cell", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("pilot-boundary")) {
      map.addSource("pilot-boundary", { type: "geojson", data: EMPTY_COLLECTION });
    }
    if (!map.getSource("radar-source")) {
      map.addSource("radar-source", {
        type: "raster",
        tiles: ["https://tilecache.rainviewer.com/v2/radar/1710000000/256/{z}/{x}/{y}/2/1_1.png"],
        tileSize: 256,
      });
    }
  }, []);

  // ── Helper 2: Ensure Custom Layers Exist ──
  const ensureCustomLayers = useCallback((map: MapLibreMap) => {
    // Pilot Boundary
    if (!map.getLayer("pilot-boundary-line")) {
      map.addLayer({
        id: "pilot-boundary-line",
        type: "line",
        source: "pilot-boundary",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2,
          "line-dasharray": [3, 2],
          "line-opacity": 0.8,
        },
      });
    }

    // RainViewer Radar
    if (!map.getLayer("radar-layer")) {
      map.addLayer({
        id: "radar-layer",
        type: "raster",
        source: "radar-source",
        paint: { "raster-opacity": 0.65 },
        layout: { visibility: "none" },
      });
    }

    // Drainage Network (cyan dashed line)
    if (!map.getLayer("drainage-line")) {
      map.addLayer({
        id: "drainage-line",
        type: "line",
        source: "drainage",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2.5,
          "line-dasharray": [2.2, 1.8],
          "line-opacity": 0.85,
          "line-offset": 3,
        },
      });
    }

    // Roads
    if (!map.getLayer("roads-context-casing")) {
      map.addLayer({
        id: "roads-context-casing",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#000000",
          "line-width": 5,
          "line-opacity": 0.45,
        },
      });
    }
    if (!map.getLayer("roads-base-line")) {
      map.addLayer({
        id: "roads-base-line",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "risk_level"], "safe"],
        paint: {
          "line-color": RISK_COLORS.safe,
          "line-width": 2,
          "line-opacity": 0.7,
        },
      });
    }
    if (!map.getLayer("roads-risk-casing")) {
      map.addLayer({
        id: "roads-risk-casing",
        type: "line",
        source: "roads",
        filter: ["!=", ["get", "risk_level"], "safe"],
        paint: {
          "line-color": "#000000",
          "line-width": [
            "match",
            ["get", "risk_level"],
            "watch", 4.5,
            "likely", 6,
            "severe", 7.5,
            4.5,
          ],
          "line-opacity": 0.65,
        },
      });
    }
    if (!map.getLayer("roads-risk-line")) {
      map.addLayer({
        id: "roads-risk-line",
        type: "line",
        source: "roads",
        filter: ["!=", ["get", "risk_level"], "safe"],
        paint: {
          "line-color": [
            "match",
            ["get", "risk_level"],
            "watch", RISK_COLORS.watch,
            "likely", RISK_COLORS.likely,
            "severe", RISK_COLORS.severe,
            RISK_COLORS.watch,
          ],
          "line-width": [
            "match",
            ["get", "risk_level"],
            "watch", 2.6,
            "likely", 3.8,
            "severe", 5,
            2.6,
          ],
          "line-opacity": 0.95,
        },
      });
    }

    // Flood Risk (ORGANIC GLOWING PLUMES, ZERO RECTANGULAR GRID)
    if (!map.getLayer("flood-plume")) {
      map.addLayer({
        id: "flood-plume",
        type: "circle",
        source: "flood-points",
        paint: {
          "circle-color": [
            "match",
            ["get", "risk_level"],
            "watch", RISK_COLORS.watch,
            "likely", RISK_COLORS.likely,
            "severe", RISK_COLORS.severe,
            RISK_COLORS.watch,
          ],
          "circle-radius": [
            "match",
            ["get", "risk_level"],
            "watch", 32,
            "likely", 46,
            "severe", 60,
            30,
          ],
          "circle-blur": 0.72,
          "circle-opacity": 0.45,
        },
      });
    }
    if (!map.getLayer("flood-core")) {
      map.addLayer({
        id: "flood-core",
        type: "circle",
        source: "flood-points",
        paint: {
          "circle-color": [
            "match",
            ["get", "risk_level"],
            "watch", RISK_COLORS.watch,
            "likely", RISK_COLORS.likely,
            "severe", RISK_COLORS.severe,
            RISK_COLORS.watch,
          ],
          "circle-radius": [
            "match",
            ["get", "risk_level"],
            "watch", 6,
            "likely", 8,
            "severe", 10,
            6,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.85,
        },
      });
    }
    // Invisible hit-test area for clicking cell polygons (ZERO RECTANGULAR VISUAL GRID)
    if (!map.getLayer("flood-fill")) {
      map.addLayer({
        id: "flood-fill",
        type: "fill",
        source: "flood",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0.001,
        },
      });
    }
    if (!map.getLayer("selected-cell-outline")) {
      map.addLayer({
        id: "selected-cell-outline",
        type: "line",
        source: "selected-cell",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2.5,
          "line-opacity": 0.9,
          "line-dasharray": [2, 2],
        },
      });
    }

    // Critical Infrastructure & Relief Centers
    if (!map.getLayer("critical-points")) {
      map.addLayer({
        id: "critical-points",
        type: "circle",
        source: "critical",
        paint: {
          "circle-radius": 7.5,
          "circle-color": [
            "match",
            ["get", "type"],
            "Hospital", "#0284c7",
            "Fire Station", "#ea580c",
            "Station", "#8b5cf6",
            "#d97706",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });
    }
    if (!map.getLayer("relief-points")) {
      map.addLayer({
        id: "relief-points",
        type: "circle",
        source: "relief",
        paint: {
          "circle-radius": 8,
          "circle-color": "#10b981",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });
    }

    // Emergency Routes
    if (!map.getLayer("route-normal-line")) {
      map.addLayer({
        id: "route-normal-line",
        type: "line",
        source: "route-normal",
        paint: {
          "line-color": "#64748b",
          "line-width": 3.5,
          "line-dasharray": [1.2, 1.2],
          "line-offset": -4,
        },
      });
    }
    if (!map.getLayer("route-aware-line")) {
      map.addLayer({
        id: "route-aware-line",
        type: "line",
        source: "route-aware",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 4.8,
          "line-offset": 4,
        },
      });
    }
  }, []);

  // ── Helper 3: Synchronize Source Data ──
  const syncSourceData = useCallback(
    (map: MapLibreMap) => {
      setSourceData(map, "flood", floodCollection);
      setSourceData(map, "flood-points", floodPointCollection);
      setSourceData(map, "roads", roadCollection);
      setSourceData(map, "drainage", drainage ?? EMPTY_COLLECTION);
      setSourceData(map, "critical", criticalCollection);
      setSourceData(map, "relief", reliefCollection);
      setSourceData(map, "route-normal", normalRouteCollection);
      setSourceData(map, "route-aware", awareRouteCollection);
      setSourceData(map, "selected-cell", selectedCellCollection);
      setSourceData(map, "pilot-boundary", pilotBoundary ?? EMPTY_COLLECTION);
    },
    [
      awareRouteCollection,
      criticalCollection,
      drainage,
      floodCollection,
      floodPointCollection,
      normalRouteCollection,
      pilotBoundary,
      reliefCollection,
      roadCollection,
      selectedCellCollection,
    ],
  );

  // ── Helper 4: Synchronize Layer Visibility ──
  const syncLayerVisibility = useCallback((map: MapLibreMap, currentLayers: typeof layers) => {
    const setVis = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    };

    setVis("radar-layer", !!currentLayers.radar);
    setVis("flood-plume", !!currentLayers.flood);
    setVis("flood-core", !!currentLayers.flood);
    setVis("flood-fill", !!currentLayers.flood);
    setVis("selected-cell-outline", !!currentLayers.flood);
    setVis("drainage-line", !!currentLayers.drainage);
    setVis("roads-context-casing", !!currentLayers.roads);
    setVis("roads-base-line", !!currentLayers.roads);
    setVis("roads-risk-casing", !!currentLayers.roads);
    setVis("roads-risk-line", !!currentLayers.roads);
    setVis("critical-points", !!currentLayers.critical);
    setVis("relief-points", !!currentLayers.relief);
    setVis("route-normal-line", !!currentLayers.route);
    setVis("route-aware-line", !!currentLayers.route);
  }, [layers]);

  // ── Helper 5: Connect Map Event Handlers ──
  const attachEventHandlers = useCallback(
    (map: MapLibreMap) => {
      // Cell Click
      const onFloodClick = (event: any) => {
        const feature = event.features?.[0];
        const cellId = feature?.properties?.cell_id as string | undefined;
        const cell = activeStep?.flood_cells.find((item) => item.cell_id === cellId);
        if (!cell) return;
        setClickedCell(cell);
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(popupHtml(cell, activeStep?.kpis?.forecast_label ?? "Nowcast"))
          .addTo(map);
      };

      // Road Click
      const onRoadClick = (e: any) => {
        if (!e.features || e.features.length === 0) return;
        setClickedRoad(e.features[0].properties);
      };

      // Critical Point Click
      const onCriticalClick = (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const p = e.features[0].properties;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding: 8px; font-family: ui-sans-serif, system-ui; font-size: 12px; color: #1e293b;">
              <span style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase;">${p.type || "Critical"} Node</span>
              <h4 style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700;">${p.name}</h4>
              <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">Status: OPERATIONAL</p>
            </div>
          `)
          .addTo(map);
      };

      // Relief Center Click
      const onReliefClick = (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const p = e.features[0].properties;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding: 8px; font-family: ui-sans-serif, system-ui; font-size: 12px; color: #1e293b;">
              <span style="font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase;">Emergency Relief Shelter</span>
              <h4 style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700;">${p.name}</h4>
              <p style="margin: 2px 0 0 0; color: #059669; font-size: 11px; font-weight: 600;">Capacity: ${p.capacity || "500 Persons"}</p>
            </div>
          `)
          .addTo(map);
      };

      (map as any).off("click", "flood-fill", onFloodClick);
      (map as any).on("click", "flood-fill", onFloodClick);

      (map as any).off("click", "roads-risk-line", onRoadClick);
      (map as any).on("click", "roads-risk-line", onRoadClick);
      (map as any).off("click", "roads-base-line", onRoadClick);
      (map as any).on("click", "roads-base-line", onRoadClick);

      (map as any).off("click", "critical-points", onCriticalClick);
      (map as any).on("click", "critical-points", onCriticalClick);

      (map as any).off("click", "relief-points", onReliefClick);
      (map as any).on("click", "relief-points", onReliefClick);

      map.on("mouseenter", "flood-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "flood-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "roads-risk-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "roads-risk-line", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "critical-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "critical-points", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "relief-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "relief-points", () => {
        map.getCanvas().style.cursor = "";
      });
    },
    [activeStep, setClickedCell, setClickedRoad],
  );

  // ── Initialize MapLibre ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isInitialGlobe = startupPhase === "globe" || startupPhase === "transitioning";
    const initialCenter = isInitialGlobe ? GLOBE_CENTER : CHENNAI_CENTER;
    const initialZoom = isInitialGlobe ? GLOBE_ZOOM : DEFAULT_ZOOM;
    const initialStyle = getBasemapStyle(basemap);

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: initialCenter,
      zoom: initialZoom,
      pitch: isInitialGlobe ? 0 : 35,
      minZoom: 1,
      maxZoom: 19,
      attributionControl: false,
      style: initialStyle,
    });

    if (isInitialGlobe) {
      try {
        map.setProjection({ type: "globe" });
      } catch {}
    }

    map.on("error", (e) => {
      const errStatus = (e.error as any)?.status;
      if (errStatus === 403 || e.error?.message?.includes("403")) {
        console.warn("MapTiler restricted origin, falling back to raster style.");
        map.setStyle(basemap === "satellite" ? FALLBACK_SATELLITE_STYLE : FALLBACK_DARK_STYLE);
      }
    });

    const onStyleReady = () => {
      ensureCustomSources(map);
      syncSourceData(map);
      ensureCustomLayers(map);
      syncLayerVisibility(map, layersRef.current);
      attachEventHandlers(map);
      setReady(true);
    };

    map.on("style.load", onStyleReady);

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── When Basemap Style Changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getBasemapStyle(basemap));
  }, [basemap]);

  // ── When Data Collections Update ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    syncSourceData(map);
  }, [ready, syncSourceData]);

  // ── When Layer Toggles Update ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    syncLayerVisibility(map, layers);
  }, [layers, ready, syncLayerVisibility]);

  // ── When ActiveStep Changes, Refresh Handlers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    attachEventHandlers(map);
  }, [activeStep, ready, attachEventHandlers]);

  // ── Globe Startup Camera Flight ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (startupPhase === "globe") {
      map.easeTo({ center: [68, 18], duration: 2800, easing: (t) => t });

      const timer = setTimeout(() => {
        setStartupPhase("transitioning");
      }, 2200);

      return () => clearTimeout(timer);
    }

    if (startupPhase === "transitioning") {
      map.flyTo({
        center: CHENNAI_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 35,
        bearing: 0,
        duration: 3800,
        essential: true,
      });

      setTimeout(() => {
        try {
          map.setProjection({ type: "mercator" });
        } catch {}
      }, 1600);

      const onFlyEnd = () => {
        setStartupPhase("chennai");
        setTimeout(() => setStartupPhase("ready"), 300);
      };

      map.once("moveend", onFlyEnd);
    }
  }, [startupPhase, ready, setStartupPhase]);

  // ── Locate Trigger ──
  useEffect(() => {
    if (locateTrigger <= 0 || !mapRef.current) return;
    mapRef.current.flyTo({
      center: CHENNAI_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 35,
      bearing: 0,
      duration: 1500,
    });
  }, [locateTrigger]);

  // ── Radar Timestamp Update ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !radarTimestamp) return;
    const radarSource = map.getSource("radar-source") as maplibregl.RasterTileSource | undefined;
    if (radarSource && (radarSource as any).setTiles) {
      (radarSource as any).setTiles([
        `https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`,
      ]);
    }
  }, [radarTimestamp, ready]);

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const handleLocate = () => {
    mapRef.current?.flyTo({
      center: CHENNAI_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 35,
      duration: 1500,
    });
  };

  const isIntro = startupPhase === "globe" || startupPhase === "transitioning";

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* MapLibre DOM Target */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Intro Globe Overlay Controls */}
      {isIntro && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between p-8">
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400 drop-shadow">
              INITIALIZING GEOSPATIAL INTELLIGENCE
            </span>
            <h1 className="font-display text-2xl font-black tracking-wider text-white drop-shadow-lg mt-1">
              CHENNAI FLOOD NOWCASTING
            </h1>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-8 w-8 border-2 border-cyan-400 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
              </span>
            </div>
            <div className="font-mono text-[11px] font-bold text-cyan-400 tracking-widest bg-black/60 px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-md">
              {startupPhase === "globe" ? "EARTH ORBIT → TARGETING SOUTH ASIA" : "LANDING IN CHENNAI [13.0827° N, 80.2707° E]"}
            </div>
          </div>

          <div className="pointer-events-auto">
            <button
              onClick={() => {
                setStartupPhase("transitioning");
                mapRef.current?.flyTo({
                  center: CHENNAI_CENTER,
                  zoom: DEFAULT_ZOOM,
                  pitch: 35,
                  duration: 800,
                  essential: true,
                });
              }}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/60 backdrop-blur-md px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-ink-200 hover:bg-white/20 hover:text-white transition-all shadow-xl"
            >
              <span>SKIP INTRO</span>
              <kbd className="rounded-xs bg-white/10 px-1 text-[10px]">ESC</kbd>
            </button>
          </div>
        </div>
      )}

      {/* Map Controls: Positioned with layout-map-controls (clearance below header), z-10 */}
      {!isIntro && (
        <div className="absolute layout-map-controls left-[288px] z-10 hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-1.5 shadow-2xl animate-fade-in">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            onClick={handleZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Locate Chennai */}
          <button
            onClick={handleLocate}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-cyan-400 transition-colors"
            title="Center Chennai"
            aria-label="Center Chennai"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Basemap Switcher (Dark / Satellite) */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg">
            <button
              onClick={() => setBasemap("dark")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                basemap === "dark"
                  ? "bg-cyan-500 text-ink-950 font-bold shadow-sm"
                  : "text-ink-400 hover:text-white"
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setBasemap("satellite")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                basemap === "satellite"
                  ? "bg-cyan-500 text-ink-950 font-bold shadow-sm"
                  : "text-ink-400 hover:text-white"
              }`}
            >
              Satellite
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Layers Toggle */}
          <button
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              layerPanelOpen ? "text-cyan-400 bg-cyan-500/20" : "text-ink-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Toggle Layers"
            aria-label="Toggle Layers"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating Road Inspection Card */}
      <RoadInspectionCard />
    </div>
  );
}
