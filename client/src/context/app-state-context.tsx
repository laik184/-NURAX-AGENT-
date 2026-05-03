import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { ExecutionClient, type ExecutionUpdate } from "@/lib/execution-client";

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type ExecutionState = {
  status: string;
  errors: ExecutionUpdate["errors"];
};

type AppStateContextValue = {
  messages: AgentMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>;

  consoleOutput: string[];
  subdomain: string;
  setSubdomain: React.Dispatch<React.SetStateAction<string>>;

  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;

  executionClient: ExecutionClient;
  executionState: ExecutionState;
  setExecutionState: React.Dispatch<React.SetStateAction<ExecutionState>>;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  /* SSE PERSISTENT START */
  // Persistent SSE connection to keep console alive across route changes
  useEffect(() => {
    let es: EventSource | null = null;
    let backoff = 1000;
    let mounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!mounted) return;
      try {
        es = new EventSource('/sse/console');
        es.onmessage = (ev: MessageEvent) => {
          if (!ev.data) return;
          if (ev.data.trim().startsWith(':')) return;
          try {
            const parsed = JSON.parse(ev.data);
            setConsoleOutput(prev => [...prev, JSON.stringify(parsed)].slice(-1000));
          } catch {
            setConsoleOutput(prev => [...prev, ev.data].slice(-1000));
          }
        };
        es.onerror = () => {
          try { es?.close(); } catch {}
          es = null;
          if (mounted) {
            backoff = Math.min(30000, backoff * 2);
            retryTimeout = setTimeout(connect, backoff);
          }
        };
      } catch (e) {
        if (mounted) {
          backoff = Math.min(30000, backoff * 2);
          retryTimeout = setTimeout(connect, backoff);
        }
      }
    };
    connect();
    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      try { if (es) es.close(); } catch {}
    };
  }, []);
  /* SSE PERSISTENT END */


  const [subdomain, setSubdomain] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: "idle",
    errors: [],
  });

  const [executionClient] = useState(() => new ExecutionClient());

  const value: AppStateContextValue = {
    messages,
    setMessages,
    consoleOutput,
    subdomain,
    setSubdomain,
    isRunning,
    setIsRunning,
    executionClient,
    executionState,
    setExecutionState,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return ctx;
}
