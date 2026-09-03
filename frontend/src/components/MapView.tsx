import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { MapPinned } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";
import type { FloodCell, GeoJsonFeature, RoadSegment, RouteResponse } from "../types/api";

const RISK_COLORS = {
  safe: "#4f8b65",
  watch: "#d9aa32",
  likely: "#c46b2d",
  severe: "#b33a3a",
};

const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };

function featureCollection(features: GeoJsonFeature[] = []) {
  return { type: "FeatureCollection", features };
}

function floodFeatures(cells: FloodCell[]): GeoJsonFeature[] {
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
        primary_cause: cell.drivers.primary_cause ?? "No elevated driver",
      },
    }));
}

function floodPointFeatures(cells: FloodCell[]): GeoJsonFeature[] {
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

function roadFeatures(roads: RoadSegment[]): GeoJsonFeature[] {
  return roads.map((road) => ({
    type: "Feature",
    geometry: road.geometry,
    properties: {
      road_id: road.road_id,
      name: road.name,
      risk_level: road.risk_level,
      depth_band: road.depth_band ?? "0-10cm",
      passable: road.passable,
    },
  }));
}

function routeFeature(route: RouteResponse | undefined, key: "normal_route" | "flood_aware_route"): GeoJsonFeature[] {
  if (!route) return [];
  const path = route[key].path;
  const coordinates = path.coordinates as unknown[];
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

function addSourcesAndLayers(map: MapLibreMap) {
  if (!map.getSource("map-context")) {
    map.addSource("map-context", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("pilot-boundary")) {
    map.addSource("pilot-boundary", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("flood")) {
    map.addSource("flood", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("flood-points")) {
    map.addSource("flood-points", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("roads")) {
    map.addSource("roads", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("drainage")) {
    map.addSource("drainage", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("critical")) {
    map.addSource("critical", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("route-normal")) {
    map.addSource("route-normal", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("route-aware")) {
    map.addSource("route-aware", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }
  if (!map.getSource("selected-cell")) {
    map.addSource("selected-cell", { type: "geojson", data: EMPTY_COLLECTION as GeoJSON.GeoJSON });
  }

  if (!map.getLayer("context-water-fill")) {
    map.addLayer({
      id: "context-water-fill",
      type: "fill",
      source: "map-context",
      filter: ["==", ["get", "kind"], "water"],
      paint: {
        "fill-color": "#b8d8dc",
        "fill-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer("context-open-space-fill")) {
    map.addLayer({
      id: "context-open-space-fill",
      type: "fill",
      source: "map-context",
      filter: ["==", ["get", "kind"], "open_space"],
      paint: {
        "fill-color": "#cfe1c6",
        "fill-opacity": 0.78,
      },
    });
  }
  if (!map.getLayer("context-institution-fill")) {
    map.addLayer({
      id: "context-institution-fill",
      type: "fill",
      source: "map-context",
      filter: ["==", ["get", "kind"], "institution"],
      paint: {
        "fill-color": "#e2ddcc",
        "fill-opacity": 0.74,
      },
    });
  }
  if (!map.getLayer("context-commercial-fill")) {
    map.addLayer({
      id: "context-commercial-fill",
      type: "fill",
      source: "map-context",
      filter: ["==", ["get", "kind"], "commercial"],
      paint: {
        "fill-color": "#ddd1bd",
        "fill-opacity": 0.72,
      },
    });
  }
  if (!map.getLayer("context-residential-fill")) {
    map.addLayer({
      id: "context-residential-fill",
      type: "fill",
      source: "map-context",
      filter: ["==", ["get", "kind"], "residential"],
      paint: {
        "fill-color": "#eef0e8",
        "fill-opacity": 0.86,
      },
    });
  }
  if (!map.getLayer("context-block-outline")) {
    map.addLayer({
      id: "context-block-outline",
      type: "line",
      source: "map-context",
      filter: ["in", ["get", "kind"], ["literal", ["residential", "commercial", "institution", "open_space", "water"]]],
      paint: {
        "line-color": "#bcc5ba",
        "line-width": 0.8,
        "line-opacity": 0.55,
      },
    });
  }
  if (!map.getLayer("context-arterial-casing")) {
    map.addLayer({
      id: "context-arterial-casing",
      type: "line",
      source: "map-context",
      filter: ["==", ["get", "kind"], "arterial"],
      paint: {
        "line-color": "#f7f9f4",
        "line-width": 7,
        "line-opacity": 0.82,
      },
    });
  }
  if (!map.getLayer("context-arterial-line")) {
    map.addLayer({
      id: "context-arterial-line",
      type: "line",
      source: "map-context",
      filter: ["==", ["get", "kind"], "arterial"],
      paint: {
        "line-color": "#bd9a55",
        "line-width": 3.2,
        "line-opacity": 0.82,
      },
    });
  }
  if (!map.getLayer("context-rail-line")) {
    map.addLayer({
      id: "context-rail-line",
      type: "line",
      source: "map-context",
      filter: ["==", ["get", "kind"], "rail"],
      paint: {
        "line-color": "#7f8b86",
        "line-width": 1.4,
        "line-opacity": 0.8,
        "line-dasharray": [0.8, 1.8],
      },
    });
  }
  if (!map.getLayer("pilot-boundary-line")) {
    map.addLayer({
      id: "pilot-boundary-line",
      type: "line",
      source: "pilot-boundary",
      paint: {
        "line-color": "#2f6f5e",
        "line-width": 2,
        "line-opacity": 0.85,
        "line-dasharray": [3, 2],
      },
    });
  }

  if (!map.getLayer("flood-plume")) {
    map.addLayer({
      id: "flood-plume",
      type: "circle",
      source: "flood-points",
      paint: {
        "circle-color": [
          "match",
          ["get", "risk_level"],
          "watch",
          RISK_COLORS.watch,
          "likely",
          RISK_COLORS.likely,
          "severe",
          RISK_COLORS.severe,
          RISK_COLORS.watch,
        ],
        "circle-radius": ["match", ["get", "risk_level"], "watch", 34, "likely", 48, "severe", 62, 30],
        "circle-blur": 0.72,
        "circle-opacity": 0.42,
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
          "watch",
          RISK_COLORS.watch,
          "likely",
          RISK_COLORS.likely,
          "severe",
          RISK_COLORS.severe,
          RISK_COLORS.watch,
        ],
        "circle-radius": ["match", ["get", "risk_level"], "watch", 5, "likely", 7, "severe", 9, 5],
        "circle-opacity": 0.62,
        "circle-stroke-color": "#f7f9f4",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": 0.65,
      },
    });
  }
  if (!map.getLayer("flood-fill")) {
    map.addLayer({
      id: "flood-fill",
      type: "fill",
      source: "flood",
      filter: ["!=", ["get", "risk_level"], "safe"],
      paint: {
        "fill-color": [
          "match",
          ["get", "risk_level"],
          "safe",
          RISK_COLORS.safe,
          "watch",
          RISK_COLORS.watch,
          "likely",
          RISK_COLORS.likely,
          "severe",
          RISK_COLORS.severe,
          RISK_COLORS.safe,
        ],
        "fill-opacity": 0.01,
      },
    });
  }
  if (!map.getLayer("flood-outline")) {
    map.addLayer({
      id: "flood-outline",
      type: "line",
      source: "flood",
      filter: ["!=", ["get", "risk_level"], "safe"],
      paint: {
        "line-color": "#68736c",
        "line-width": 0,
        "line-opacity": 0,
      },
    });
  }
  if (!map.getLayer("selected-cell-outline")) {
    map.addLayer({
      id: "selected-cell-outline",
      type: "line",
      source: "selected-cell",
      paint: {
        "line-color": "#1f2a27",
        "line-width": 3,
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer("drainage-line")) {
    map.addLayer({
      id: "drainage-line",
      type: "line",
      source: "drainage",
      paint: {
        "line-color": "#1f6f78",
        "line-width": 2,
        "line-opacity": 0.74,
        "line-dasharray": [2.2, 1.8],
        "line-offset": 4,
      },
    });
  }
  if (!map.getLayer("roads-base-line")) {
    map.addLayer({
      id: "roads-context-casing",
      type: "line",
      source: "roads",
      paint: {
        "line-color": "#ffffff",
        "line-width": 5.6,
        "line-opacity": 0.72,
      },
    });
    map.addLayer({
      id: "roads-base-line",
      type: "line",
      source: "roads",
      filter: ["==", ["get", "risk_level"], "safe"],
      paint: {
        "line-color": "#626d67",
        "line-width": 1.15,
        "line-opacity": 0.42,
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
        "line-color": "#f7f9f4",
        "line-width": [
          "match",
          ["get", "risk_level"],
          "watch",
          4,
          "likely",
          5.4,
          "severe",
          6.8,
          4,
        ],
        "line-opacity": 0.86,
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
          "watch",
          RISK_COLORS.watch,
          "likely",
          RISK_COLORS.likely,
          "severe",
          RISK_COLORS.severe,
          RISK_COLORS.watch,
        ],
        "line-width": [
          "match",
          ["get", "risk_level"],
          "watch",
          2.4,
          "likely",
          3.4,
          "severe",
          4.4,
          2.4,
        ],
        "line-opacity": 0.96,
      },
    });
  }
  if (!map.getLayer("route-normal-line")) {
    map.addLayer({
      id: "route-normal-line",
      type: "line",
      source: "route-normal",
      paint: {
        "line-color": "#313b37",
        "line-width": 3.2,
        "line-dasharray": [1.2, 1.2],
        "line-offset": -5,
      },
    });
  }
  if (!map.getLayer("route-aware-line")) {
    map.addLayer({
      id: "route-aware-line",
      type: "line",
      source: "route-aware",
      paint: {
        "line-color": "#155e63",
        "line-width": 4.6,
        "line-offset": 5,
      },
    });
  }
  if (!map.getLayer("critical-points")) {
    map.addLayer({
      id: "critical-points",
      type: "circle",
      source: "critical",
      paint: {
        "circle-radius": 7,
        "circle-color": "#f7f9f4",
        "circle-stroke-color": "#1f2a27",
        "circle-stroke-width": 2,
      },
    });
  }
}

function fitToFloodCells(map: MapLibreMap, cells: FloodCell[]) {
  const coords = cells.flatMap((cell) => {
    const geometry = cell.geometry;
    if (!geometry || geometry.type !== "Polygon") return [];
    const rings = geometry.coordinates as number[][][];
    return rings.flat();
  });
  if (!coords.length) return;
  const bounds = coords.reduce(
    (acc, coord) => acc.extend(coord as [number, number]),
    new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
  );
  map.fitBounds(bounds, { padding: 42, duration: 0 });
}

function popupHtml(cell: FloodCell, forecastLabel: string) {
  return `
    <div class="map-popup">
      <h3>${cell.cell_id}</h3>
      <p><strong>Risk:</strong> ${cell.risk_level}</p>
      <p><strong>Depth band:</strong> ${cell.depth_band}</p>
      <p><strong>Likely cause:</strong> ${cell.drivers.primary_cause ?? "No elevated driver"}</p>
      <p><strong>Forecast:</strong> ${forecastLabel}</p>
      <p><strong>Confidence:</strong> ${cell.confidence}</p>
      <p><strong>Road impact:</strong> Derived from intersecting demo roads</p>
    </div>
  `;
}

export default function MapView() {
  const {
    activeStep,
    drainage,
    mapContext,
    pilotBoundary,
    criticalInfrastructure,
    layers,
    route,
    clickedCell,
    loading,
    error,
    setClickedCell,
  } = useFloodStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

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
  const normalRouteCollection = useMemo(() => featureCollection(routeFeature(route, "normal_route")), [route]);
  const awareRouteCollection = useMemo(() => featureCollection(routeFeature(route, "flood_aware_route")), [route]);
  const selectedCellCollection = useMemo(() => {
    if (!clickedCell?.geometry) return featureCollection([]);
    return featureCollection([
      {
        type: "Feature",
        geometry: clickedCell.geometry,
        properties: {
          cell_id: clickedCell.cell_id,
        },
      },
    ]);
  }, [clickedCell]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [80.25, 13.045],
      zoom: 13.4,
      minZoom: 12,
      maxZoom: 17,
      attributionControl: false,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#dfe6d9" },
          },
        ],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      addSourcesAndLayers(map);
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setSourceData(map, "map-context", mapContext ?? EMPTY_COLLECTION);
    setSourceData(map, "pilot-boundary", pilotBoundary ?? EMPTY_COLLECTION);
    setSourceData(map, "flood", floodCollection);
    setSourceData(map, "flood-points", floodPointCollection);
    setSourceData(map, "roads", roadCollection);
    setSourceData(map, "drainage", drainage ?? EMPTY_COLLECTION);
    setSourceData(map, "critical", criticalInfrastructure ?? EMPTY_COLLECTION);
    setSourceData(map, "route-normal", normalRouteCollection);
    setSourceData(map, "route-aware", awareRouteCollection);
    setSourceData(map, "selected-cell", selectedCellCollection);
    if (!fittedRef.current && activeStep?.flood_cells.length) {
      fitToFloodCells(map, activeStep.flood_cells);
      fittedRef.current = true;
    }
  }, [
    activeStep?.flood_cells,
    awareRouteCollection,
    criticalInfrastructure,
    drainage,
    floodCollection,
    floodPointCollection,
    mapContext,
    normalRouteCollection,
    pilotBoundary,
    ready,
    roadCollection,
    selectedCellCollection,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visibility = {
      flood: layers.flood ? "visible" : "none",
      drainage: layers.drainage ? "visible" : "none",
      roads: layers.roads ? "visible" : "none",
      critical: layers.critical ? "visible" : "none",
      route: layers.route ? "visible" : "none",
    } as const;
    for (const layerId of ["flood-plume", "flood-core", "flood-fill", "flood-outline", "selected-cell-outline"]) {
      map.setLayoutProperty(layerId, "visibility", visibility.flood);
    }
    map.setLayoutProperty("drainage-line", "visibility", visibility.drainage);
    for (const layerId of ["roads-context-casing", "roads-base-line", "roads-risk-casing", "roads-risk-line"]) {
      map.setLayoutProperty(layerId, "visibility", visibility.roads);
    }
    map.setLayoutProperty("critical-points", "visibility", visibility.critical);
    map.setLayoutProperty("route-normal-line", "visibility", visibility.route);
    map.setLayoutProperty("route-aware-line", "visibility", visibility.route);
  }, [layers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !activeStep) return;
    const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const cellId = feature?.properties?.cell_id as string | undefined;
      const cell = activeStep.flood_cells.find((item) => item.cell_id === cellId);
      if (!cell) return;
      setClickedCell(cell);
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(event.lngLat)
        .setHTML(popupHtml(cell, activeStep.kpis.forecast_label))
        .addTo(map);
    };
    const handleEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", "flood-fill", handleClick);
    map.on("mouseenter", "flood-fill", handleEnter);
    map.on("mouseleave", "flood-fill", handleLeave);
    return () => {
      map.off("click", "flood-fill", handleClick);
      map.off("mouseenter", "flood-fill", handleEnter);
      map.off("mouseleave", "flood-fill", handleLeave);
    };
  }, [activeStep, ready, setClickedCell]);

  return (
    <section className="relative h-full min-h-[480px] overflow-hidden border border-ops-line bg-ops-field shadow-panel">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-4 top-4 max-w-[280px] border border-ops-line bg-ops-paper/95 px-3 py-2 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-ops-ink">
          <MapPinned className="h-4 w-4 text-ops-accent" />
          Pilot Zone (illustrative boundary)
        </div>
        <p className="mt-1 text-xs leading-4 text-ops-muted">Offline basemap context · flood overlay bands</p>
      </div>
      <div className="absolute bottom-4 left-1/2 w-[min(94%,520px)] -translate-x-1/2 border border-ops-line bg-ops-paper/95 px-3 py-2 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase text-ops-muted">Map Key</span>
          {[
            ["0-10 cm", RISK_COLORS.safe],
            ["10-30 cm", RISK_COLORS.watch],
            ["30-60 cm", RISK_COLORS.likely],
            [">60 cm", RISK_COLORS.severe],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-2">
              <span className="h-3 w-5 border border-ops-line" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="absolute bottom-4 left-4 border border-ops-line bg-ops-paper px-3 py-2 text-xs font-semibold text-ops-ink">
          Refreshing reduced-order nowcast...
        </div>
      ) : null}
      {error ? (
        <div className="absolute bottom-4 right-4 max-w-[340px] border border-ops-red bg-ops-paper px-3 py-2 text-xs text-ops-red">
          {error}
        </div>
      ) : null}
    </section>
  );
}
