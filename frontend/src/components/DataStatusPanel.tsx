import { useEffect, useState } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";
import { fetchDataStatus } from "../api/client";
import type { DataLayerStatus } from "../types/api";

const CLASS_STYLES = {
  OBSERVED: "border-ops-green text-ops-green",
  DERIVED: "border-ops-accent text-ops-accentDark",
  INFERRED: "border-ops-orange text-ops-orange",
  SIMULATED: "border-ops-red text-ops-red",
};

export default function DataStatusPanel() {
  const [layers, setLayers] = useState<DataLayerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  async function refresh() {
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await fetchDataStatus();
      setLayers(response.layers);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data status refresh failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-4 w-4 text-ops-accent" />
          <h2 className="text-sm font-bold">Data Status</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex items-center gap-2 border border-ops-line bg-white px-3 py-2 text-xs font-bold hover:border-ops-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      {message ? <div className="mb-3 border border-ops-orange bg-white/70 p-2 text-xs text-ops-orange">{message}</div> : null}
      <div className="overflow-hidden border border-ops-line">
        <table className="w-full border-collapse bg-white/70 text-sm">
          <thead className="bg-ops-field text-left text-xs uppercase text-ops-muted">
            <tr>
              <th className="px-3 py-2">Layer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Classification</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.name} className="border-t border-ops-line align-top">
                <td className="px-3 py-3">
                  <div className="font-bold">{layer.name}</div>
                  <div className="mt-1 text-xs leading-4 text-ops-muted">{layer.detail}</div>
                </td>
                <td className="px-3 py-3 font-semibold">{layer.status}</td>
                <td className="px-3 py-3">
                  <span className={`inline-block border px-2 py-1 text-xs font-bold ${CLASS_STYLES[layer.classification]}`}>
                    {layer.classification}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
