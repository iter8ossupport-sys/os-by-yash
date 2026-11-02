import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialState } from "./seed";
import { syncPrioritiesWithProjects } from "./logic";
import { migrateOSState } from "./reviews/migrations";
import type { OSState } from "./types";

const KEY = "yash-os-v1";
type Ctx = {
  state: OSState;
  update: (fn: (s: OSState) => OSState) => void;
  goalsOpen: boolean;
  setGoalsOpen: (v: boolean) => void;
};
const OSContext = createContext<Ctx | null>(null);

export function OSProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OSState>(() =>
    syncPrioritiesWithProjects(initialState),
  );
  const [goalsOpen, setGoalsOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState(migrateOSState(parsed));
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const apply = () => {
      const dark =
        state.theme === "dark" ||
        (state.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.theme]);

  const update = useCallback((fn: (s: OSState) => OSState) => setState(fn), []);
  return (
    <OSContext.Provider value={{ state, update, goalsOpen, setGoalsOpen }}>
      {children}
    </OSContext.Provider>
  );
}

export function useOS() {
  const c = useContext(OSContext);
  if (!c) throw new Error("useOS outside provider");
  return c;
}

export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

export const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (
    (h ? `${h}:` : "") +
    `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
  );
};
export const fmtMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
