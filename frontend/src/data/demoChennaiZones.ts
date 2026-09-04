import type { FeatureCollection } from "../types/api";

export interface DemoFloodZoneProps {
  id: string;
  name: string;
  risk_level: "safe" | "watch" | "likely" | "severe";
  depth_cm: number;
  depth_band: string;
  confidence: "High" | "Moderate" | "Low";
  status: "SIMULATED";
  primary_driver: string;
}

export const DEMO_CHENNAI_FLOOD_ZONES: FeatureCollection<DemoFloodZoneProps> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.208, 12.975],
            [80.222, 12.981],
            [80.228, 12.972],
            [80.223, 12.961],
            [80.211, 12.964],
            [80.208, 12.975],
          ],
        ],
      },
      properties: {
        id: "zone-velachery",
        name: "Velachery Lake Catchment & Bypass Basin",
        risk_level: "severe",
        depth_cm: 65,
        depth_band: ">60cm",
        confidence: "High",
        status: "SIMULATED",
        primary_driver: "Lake spillover & inadequate storm drain outflow",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.224, 12.949],
            [80.242, 12.955],
            [80.248, 12.938],
            [80.233, 12.925],
            [80.221, 12.935],
            [80.224, 12.949],
          ],
        ],
      },
      properties: {
        id: "zone-pallikaranai",
        name: "Pallikaranai Wetland Fringe & Perungudi",
        risk_level: "severe",
        depth_cm: 54,
        depth_band: "30-60cm",
        confidence: "High",
        status: "SIMULATED",
        primary_driver: "Marshland runoff backpressure & topography depression",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.065, 12.925],
            [80.088, 12.936],
            [80.098, 12.918],
            [80.081, 12.905],
            [80.065, 12.925],
          ],
        ],
      },
      properties: {
        id: "zone-mudichur",
        name: "Mudichur Basin & Outer Adyar Inundation",
        risk_level: "severe",
        depth_cm: 72,
        depth_band: ">60cm",
        confidence: "High",
        status: "SIMULATED",
        primary_driver: "Adyar upper basin discharge",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.252, 13.116],
            [80.269, 13.124],
            [80.275, 13.107],
            [80.258, 13.101],
            [80.252, 13.116],
          ],
        ],
      },
      properties: {
        id: "zone-vyasarpadi",
        name: "Vyasarpadi & Buckingham Canal Confluence",
        risk_level: "likely",
        depth_cm: 38,
        depth_band: "30-60cm",
        confidence: "Moderate",
        status: "SIMULATED",
        primary_driver: "Canal tidal backflow & storm drain sedimentation",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.198, 13.118],
            [80.218, 13.125],
            [80.222, 13.109],
            [80.202, 13.102],
            [80.198, 13.118],
          ],
        ],
      },
      properties: {
        id: "zone-kolathur",
        name: "Kolathur & Retteri Lake Catchment",
        risk_level: "watch",
        depth_cm: 22,
        depth_band: "10-30cm",
        confidence: "Moderate",
        status: "SIMULATED",
        primary_driver: "Local catchment depression",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.228, 13.042],
            [80.246, 13.048],
            [80.249, 13.033],
            [80.231, 13.028],
            [80.228, 13.042],
          ],
        ],
      },
      properties: {
        id: "zone-tnagar",
        name: "T. Nagar / Mambalam Canal Lowland",
        risk_level: "likely",
        depth_cm: 32,
        depth_band: "30-60cm",
        confidence: "Moderate",
        status: "SIMULATED",
        primary_driver: "Mambalam canal bottleneck",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.171, 13.018],
            [80.192, 13.025],
            [80.195, 13.008],
            [80.175, 13.001],
            [80.171, 13.018],
          ],
        ],
      },
      properties: {
        id: "zone-manapakkam",
        name: "Manapakkam & Ramapuram Adyar Floodplain",
        risk_level: "likely",
        depth_cm: 35,
        depth_band: "30-60cm",
        confidence: "Moderate",
        status: "SIMULATED",
        primary_driver: "Adyar river curve overspill",
      },
    },
  ],
};

export interface DemoInfraProperties {
  id: string;
  name: string;
  category: "HOSPITAL" | "STATION" | "SHELTER" | "AIRPORT";
  status: "OPERATIONAL" | "ACCESSIBLE" | "ALERT";
  capacity?: string;
  address: string;
}

export const DEMO_CHENNAI_INFRASTRUCTURE: FeatureCollection<DemoInfraProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.279, 13.082] },
      properties: {
        id: "infra-central-station",
        name: "Puratchi Thalaivar Dr. M.G.R. Central Railway Station",
        category: "STATION",
        status: "OPERATIONAL",
        address: "Kannappar Thidal, Periyamet, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.281, 13.081] },
      properties: {
        id: "infra-rg-hospital",
        name: "Rajiv Gandhi Govt General Hospital",
        category: "HOSPITAL",
        status: "OPERATIONAL",
        capacity: "3,000 beds (Level 1 Trauma)",
        address: "EVR Periyar Salai, Park Town, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.252, 13.058] },
      properties: {
        id: "infra-apollo-greams",
        name: "Apollo Hospital (Greams Road)",
        category: "HOSPITAL",
        status: "OPERATIONAL",
        capacity: "600 beds",
        address: "Greams Lane, Thousand Lights, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.183, 13.018] },
      properties: {
        id: "infra-miot",
        name: "MIOT International Hospital",
        category: "HOSPITAL",
        status: "ALERT",
        capacity: "1,000 beds",
        address: "Manapakkam, Mount-Poonamallee Rd, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.174, 12.989] },
      properties: {
        id: "infra-airport",
        name: "Chennai International Airport (MAA)",
        category: "AIRPORT",
        status: "OPERATIONAL",
        address: "GST Road, Meenambakkam, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.218, 13.085] },
      properties: {
        id: "infra-shelter-annanagar",
        name: "Anna Nagar Community Relief Shelter",
        category: "SHELTER",
        status: "ACCESSIBLE",
        capacity: "1,200 persons",
        address: "2nd Avenue, Anna Nagar West, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.222, 12.973] },
      properties: {
        id: "infra-shelter-velachery",
        name: "Velachery Relief Center (Aquatic Complex)",
        category: "SHELTER",
        status: "ACCESSIBLE",
        capacity: "850 persons",
        address: "Velachery Bypass Rd, Chennai",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [80.244, 12.962] },
      properties: {
        id: "infra-shelter-perungudi",
        name: "Perungudi Multi-Purpose Relief Shelter",
        category: "SHELTER",
        status: "ACCESSIBLE",
        capacity: "1,500 persons",
        address: "OMR, Perungudi, Chennai",
      },
    },
  ],
};
