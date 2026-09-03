import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCriticalInfrastructure,
  fetchDrainage,
  fetchForecast,
  fetchHealth,
  fetchMapContext,
  fetchNowcast,
  fetchPilotBoundary,
} from "../api/client";
import type {
  FeatureCollection,
  FloodCell,
  ForecastMinutes,
  ForecastResponse,
  ForecastStep,
  HealthResponse,
  NowcastResponse,
  RouteResponse,
  Scenario,
  ScenarioOptionsResponse,
} from "../types/api";
import { fetchScenarioOptions } from "../api/client";

export interface LayerState {
  flood: boolean;
  drainage: boolean;
  roads: boolean;
  critical: boolean;
  route: boolean;
}

interface FloodStoreValue {
  scenario: Scenario;
  options?: ScenarioOptionsResponse;
  health?: HealthResponse;
  nowcast?: NowcastResponse;
  forecast?: ForecastResponse;
  activeStep?: ForecastStep;
  selectedForecastMinute: number;
  setSelectedForecastMinute: (minute: number) => void;
  setScenario: React.Dispatch<React.SetStateAction<Scenario>>;
  runNowcast: (nextScenario?: Scenario) => Promise<void>;
  layers: LayerState;
  toggleLayer: (layer: keyof LayerState) => void;
  drainage?: FeatureCollection;
  mapContext?: FeatureCollection;
  pilotBoundary?: FeatureCollection;
  criticalInfrastructure?: FeatureCollection;
  clickedCell?: FloodCell;
  setClickedCell: (cell?: FloodCell) => void;
  route?: RouteResponse;
  setRoute: (route?: RouteResponse) => void;
  loading: boolean;
  error?: string;
  clearError: () => void;
}

const DEFAULT_SCENARIO: Scenario = {
  rainfall_intensity: "heavy",
  drainage_condition: "normal",
  forecast_minutes: 60,
};

const DEFAULT_LAYERS: LayerState = {
  flood: true,
  drainage: true,
  roads: true,
  critical: true,
  route: true,
};

const FloodStore = createContext<FloodStoreValue | undefined>(undefined);

function pickFocusCell(step?: ForecastStep): FloodCell | undefined {
  if (!step) return undefined;
  return (
    step.flood_cells.find((cell) => cell.risk_level === "severe") ??
    step.flood_cells.find((cell) => cell.risk_level === "likely") ??
    step.flood_cells.find((cell) => cell.risk_level === "watch") ??
    step.flood_cells[0]
  );
}

export function FloodStoreProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const scenarioRef = useRef<Scenario>(DEFAULT_SCENARIO);
  const [options, setOptions] = useState<ScenarioOptionsResponse>();
  const [health, setHealth] = useState<HealthResponse>();
  const [nowcast, setNowcast] = useState<NowcastResponse>();
  const [forecast, setForecast] = useState<ForecastResponse>();
  const [selectedForecastMinute, setSelectedForecastMinuteState] = useState<number>(DEFAULT_SCENARIO.forecast_minutes);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [drainage, setDrainage] = useState<FeatureCollection>();
  const [mapContext, setMapContext] = useState<FeatureCollection>();
  const [pilotBoundary, setPilotBoundary] = useState<FeatureCollection>();
  const [criticalInfrastructure, setCriticalInfrastructure] = useState<FeatureCollection>();
  const [clickedCell, setClickedCell] = useState<FloodCell>();
  const [route, setRoute] = useState<RouteResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const activeStep = useMemo(() => {
    if (!forecast) return undefined;
    return forecast.steps.find((step) => step.forecast_minutes === selectedForecastMinute) ?? forecast.steps[0];
  }, [forecast, selectedForecastMinute]);

  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  const setSelectedForecastMinute = useCallback((minute: number) => {
    setSelectedForecastMinuteState(minute);
    if ([30, 60, 120, 180].includes(minute)) {
      setScenario((current) => ({ ...current, forecast_minutes: minute as ForecastMinutes }));
    }
  }, []);

  const runNowcast = useCallback(
    async (nextScenario?: Scenario) => {
      const target = nextScenario ?? scenarioRef.current;
      setLoading(true);
      setError(undefined);
      try {
        const [nextHealth, response] = await Promise.all([fetchHealth(), fetchNowcast(target)]);
        const nextForecast = await fetchForecast(target);
        setHealth(nextHealth);
        setScenario(response.scenario);
        setNowcast(response);
        setForecast(nextForecast);
        setSelectedForecastMinuteState(response.scenario.forecast_minutes);
        const matchingStep = nextForecast.steps.find(
          (step) => step.forecast_minutes === response.scenario.forecast_minutes,
        );
        setClickedCell(pickFocusCell(matchingStep));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh the nowcast");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    async function boot() {
      setLoading(true);
      try {
        const [nextOptions, nextDrainage, nextCritical, nextMapContext, nextPilotBoundary] = await Promise.all([
          fetchScenarioOptions(),
          fetchDrainage(),
          fetchCriticalInfrastructure(),
          fetchMapContext(),
          fetchPilotBoundary(),
        ]);
        if (!mounted) return;
        setOptions(nextOptions);
        setDrainage(nextDrainage);
        setCriticalInfrastructure(nextCritical);
        setMapContext(nextMapContext);
        setPilotBoundary(nextPilotBoundary);
        await runNowcast(nextOptions.default);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load demo data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void boot();
    return () => {
      mounted = false;
    };
  }, [runNowcast]);

  useEffect(() => {
    if (activeStep && clickedCell) {
      const matching = activeStep.flood_cells.find((cell) => cell.cell_id === clickedCell.cell_id);
      if (matching) {
        setClickedCell(matching);
      }
    }
  }, [activeStep, clickedCell?.cell_id]);

  const toggleLayer = useCallback((layer: keyof LayerState) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  const value = useMemo<FloodStoreValue>(
    () => ({
      scenario,
      options,
      health,
      nowcast,
      forecast,
      activeStep,
      selectedForecastMinute,
      setSelectedForecastMinute,
      setScenario,
      runNowcast,
      layers,
      toggleLayer,
      drainage,
      mapContext,
      pilotBoundary,
      criticalInfrastructure,
      clickedCell,
      setClickedCell,
      route,
      setRoute,
      loading,
      error,
      clearError: () => setError(undefined),
    }),
    [
      activeStep,
      clickedCell,
      criticalInfrastructure,
      drainage,
      error,
      forecast,
      health,
      layers,
      loading,
      mapContext,
      nowcast,
      options,
      pilotBoundary,
      route,
      runNowcast,
      scenario,
      selectedForecastMinute,
      setSelectedForecastMinute,
      toggleLayer,
    ],
  );

  return <FloodStore.Provider value={value}>{children}</FloodStore.Provider>;
}

export function useFloodStore() {
  const context = useContext(FloodStore);
  if (!context) {
    throw new Error("useFloodStore must be used inside FloodStoreProvider");
  }
  return context;
}
