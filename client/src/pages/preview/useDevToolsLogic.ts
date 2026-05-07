import { useState, useRef, useEffect } from "react";
import type { DevToolsTab } from "./preview-types";

interface UseDevToolsLogicArgs {
  networkMode: "normal" | "slow" | "offline";
  followSharedPreview: boolean;
  setCurrentUrl: React.Dispatch<React.SetStateAction<string>>;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  setDeviceType: React.Dispatch<React.SetStateAction<any>>;
  setDevToolsTab: React.Dispatch<React.SetStateAction<DevToolsTab>>;
  setGridMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIframeKey: React.Dispatch<React.SetStateAction<number>>;
}

export function useDevToolsLogic({
  networkMode,
  followSharedPreview,
  setCurrentUrl,
  setUrlInput,
  setDeviceType,
  setDevToolsTab,
  setGridMode,
  setIframeKey,
}: UseDevToolsLogicArgs) {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devToolsMinimized, setDevToolsMinimized] = useState(false);
  const [devToolsHeight, setDevToolsHeight] = useState(280);
  const [consoleLogs, setConsoleLogs] = useState<Array<{type: string; message: string; time: string}>>([]);
  const [networkRequests, setNetworkRequests] = useState<Array<{method: string; url: string; status: string; type: string; time: string}>>([]);
  const [networkLogs, setNetworkLogs] = useState<any[]>([]);
  const [domElements, setDomElements] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const lastPerfIndexRef = useRef<number>(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then(reg => { if (reg.active) reg.active.postMessage({ type: "SET_NET_MODE", mode: networkMode }); })
      .catch(() => {});
  }, [networkMode]);

  useEffect(() => {
    const es = new EventSource("/sse/console");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === "done") setIframeKey((k) => k + 1);
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!followSharedPreview) return;
    const es = new EventSource("/sse/preview");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.url) {
          setCurrentUrl(data.url);
          setUrlInput(/^https?:\/\//.test(data.url) ? data.url : `http://${data.url}`);
        }
        if (data.deviceType) setDeviceType(data.deviceType as any);
        if (data.devToolsTab) setDevToolsTab(data.devToolsTab as any);
        if (typeof data.gridMode === "boolean") setGridMode(data.gridMode);
      } catch {}
    };
    es.onerror = () => { try { es.close(); } catch {} };
    return () => { try { es.close(); } catch {} };
  }, [followSharedPreview]);

  const handleDevToolsResizeMouseDown = (e: any) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = devToolsHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      let next = startHeight + delta;
      const minHeight = 160;
      const maxHeight = Math.max(200, window.innerHeight - 120);
      if (next < minHeight) next = minHeight;
      if (next > maxHeight) next = maxHeight;
      setDevToolsHeight(next);
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const publishPreviewState = async (partial?: Partial<{ url: string; deviceType: string; devToolsTab: string; gridMode: boolean }>) => {
    try {
      await fetch("/api/preview-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial ?? {}),
      });
    } catch {}
  };

  return {
    devToolsOpen, setDevToolsOpen,
    devToolsMinimized, setDevToolsMinimized,
    devToolsHeight,
    consoleLogs, setConsoleLogs,
    networkRequests, setNetworkRequests,
    networkLogs, setNetworkLogs, lastPerfIndexRef,
    domElements, setDomElements,
    menuOpen, setMenuOpen,
    handleDevToolsResizeMouseDown,
    publishPreviewState,
  };
}
