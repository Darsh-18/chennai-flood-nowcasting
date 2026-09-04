export interface RadarData {
  timestamp: number;
  tileUrl: string;
  isLive: boolean;
}

export async function fetchLatestRadarTimestamp(): Promise<RadarData | null> {
  try {
    const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!resp.ok) return null;
    const data = await resp.json();
    const past = data?.radar?.past;
    if (Array.isArray(past) && past.length > 0) {
      const latest = past[past.length - 1];
      const time = latest.time;
      return {
        timestamp: time,
        tileUrl: `https://tilecache.rainviewer.com/v2/radar/${time}/256/{z}/{x}/{y}/2/1_1.png`,
        isLive: true,
      };
    }
    return null;
  } catch (err) {
    console.warn("RainViewer radar feed unavailable:", err);
    return null;
  }
}
