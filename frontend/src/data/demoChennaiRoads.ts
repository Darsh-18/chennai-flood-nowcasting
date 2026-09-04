import type { FeatureCollection } from "../types/api";

export interface DemoRoadProperties {
  id: string;
  name: string;
  severity: "SAFE" | "WATCH" | "LIKELY" | "SEVERE";
  flood_depth: string;
  status: "NORMAL" | "AFFECTED" | "IMPASSABLE" | "WATERLOGGED";
  passable: boolean;
  forecast: string;
  classification: "DEMO / SIMULATED";
  length_km: number;
}

export const DEMO_CHENNAI_ROADS: FeatureCollection<DemoRoadProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2785, 13.0836],
          [80.2612, 13.0601],
          [80.2435, 13.0418],
          [80.2205, 13.0067],
        ],
      },
      properties: {
        id: "road-anna-salai",
        name: "Anna Salai (Mount Road)",
        severity: "WATCH",
        flood_depth: "12 cm",
        status: "AFFECTED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 11.2,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2750, 13.0825],
          [80.2415, 13.0768],
          [80.2081, 13.0712],
          [80.1915, 13.0694],
          [80.1420, 13.0515],
        ],
      },
      properties: {
        id: "road-poonamallee-hr",
        name: "Poonamallee High Road (EVR Salai)",
        severity: "LIKELY",
        flood_depth: "28 cm",
        status: "WATERLOGGED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 14.5,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2205, 13.0067],
          [80.2190, 12.9780],
          [80.2160, 12.9690],
          [80.1940, 12.9410],
          [80.1210, 12.9230],
        ],
      },
      properties: {
        id: "road-velachery-main",
        name: "Velachery Main Road & 100ft Bypass",
        severity: "SEVERE",
        flood_depth: "58 cm",
        status: "IMPASSABLE",
        passable: false,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 9.8,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2520, 13.0060],
          [80.2480, 12.9810],
          [80.2430, 12.9610],
          [80.2310, 12.9360],
          [80.2240, 12.9010],
        ],
      },
      properties: {
        id: "road-omr",
        name: "Rajiv Gandhi IT Expressway (OMR)",
        severity: "WATCH",
        flood_depth: "14 cm",
        status: "AFFECTED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 15.0,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2070, 13.0070],
          [80.1810, 12.9810],
          [80.1550, 12.9610],
          [80.1420, 12.9510],
          [80.1210, 12.9230],
        ],
      },
      properties: {
        id: "road-gst",
        name: "Grand Southern Trunk Road (GST)",
        severity: "SEVERE",
        flood_depth: "52 cm",
        status: "IMPASSABLE",
        passable: false,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 16.2,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.1915, 13.0694],
          [80.2080, 13.0500],
          [80.2110, 13.0330],
          [80.2100, 13.0180],
          [80.2070, 13.0070],
        ],
      },
      properties: {
        id: "road-inner-ring",
        name: "Inner Ring Road (100 Feet / JN Salai)",
        severity: "LIKELY",
        flood_depth: "34 cm",
        status: "WATERLOGGED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 8.9,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2590, 12.9820],
          [80.2610, 12.9610],
          [80.2620, 12.9480],
          [80.2640, 12.9280],
          [80.2590, 12.8980],
        ],
      },
      properties: {
        id: "road-ecr",
        name: "East Coast Road (ECR)",
        severity: "SAFE",
        flood_depth: "4 cm",
        status: "NORMAL",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 12.4,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2070, 13.0070],
          [80.2230, 13.0040],
          [80.2390, 13.0050],
          [80.2520, 13.0060],
        ],
      },
      properties: {
        id: "road-sardar-patel",
        name: "Sardar Patel Road (Guindy - Adyar)",
        severity: "SAFE",
        flood_depth: "6 cm",
        status: "NORMAL",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 5.1,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2860, 13.0800],
          [80.2830, 13.0550],
          [80.2790, 13.0330],
          [80.2720, 13.0110],
        ],
      },
      properties: {
        id: "road-kamarajar-salai",
        name: "Kamarajar Salai (Marina Coastal Promenade)",
        severity: "WATCH",
        flood_depth: "15 cm",
        status: "AFFECTED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 8.3,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2630, 13.1110],
          [80.2380, 13.1360],
          [80.1950, 13.1750],
        ],
      },
      properties: {
        id: "road-gnt",
        name: "Grand Northern Trunk (GNT / NH 16)",
        severity: "LIKELY",
        flood_depth: "31 cm",
        status: "WATERLOGGED",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 10.7,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2150, 13.0850],
          [80.1650, 13.0980],
          [80.1080, 13.1140],
        ],
      },
      properties: {
        id: "road-cth",
        name: "Chennai - Tiruvallur High Road (CTH)",
        severity: "SAFE",
        flood_depth: "8 cm",
        status: "NORMAL",
        passable: true,
        forecast: "T+30 min",
        classification: "DEMO / SIMULATED",
        length_km: 13.0,
      },
    },
  ],
};
