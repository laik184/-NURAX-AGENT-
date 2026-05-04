import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { usePreviewRuntime } from "../hooks/usePreviewRuntime";
import { ArrowLeft, ArrowRight, MoreVertical, Monitor, MonitorX, Terminal, LayoutGrid, Play, RefreshCw, RotateCw, ExternalLink, ChevronLeft, ChevronRight, Lock, Database, UserCheck, Plus, Search, X, Link as LinkIcon, Wrench, Copy, Check, AlertTriangle, ChevronDown, Smartphone, Tablet, Code, Settings, HelpCircle, Keyboard, Globe, Server, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAppState } from "@/context/app-state-context";
import { GridPreviewPage } from "@/components/grid-preview-page";
import { GridAgentPage } from "@/components/grid-agent-page";
import { GridConsolePage } from "@/components/grid-console-page";
import { GridPublishingPage } from "@/components/grid-publishing-page";
import { FilesModal } from "@/components/files-modal";
import { URLSharingModal } from "@/components/url-sharing-modal";

const RELOAD_DEBOUNCE_MS = 2500;

type DeviceKey = "fullsize";

interface DeviceConfig {
  label: string;
  width: string | null;
  height: string | null;
  frame: "none" | "phone" | "tablet";
  dims?: string;
}

const DEVICE_CONFIGS: Record<DeviceKey, DeviceConfig> = {
  "fullsize": { label: "Full size", width: null, height: null, frame: "none" },
};

const DEVICE_GROUPS: { groupLabel: string; keys: DeviceKey[] }[] = [
  { groupLabel: "General", keys: ["fullsize"] },
];

function usePreviewGuard() {
  const lastReload = useRef(0);

  const safeReload = (reload: () => void) => {
    const now = Date.now();
    if (now - lastReload.current > RELOAD_DEBOUNCE_MS) {
      lastReload.current = now;
      reload();
    }
  };

  return { safeReload };
}

type DeviceType = "desktop" | "iphone" | "ipad" | "android";
type DevToolsTab = "console" | "elements" | "network";

interface ElementInfo {
  tag: string;
  id: string;
  classes: string[];
  rect: { width: number; height: number; top: number; left: number };
  styles: Record<string, string>;
  attributes: Record<string, string>;
}

export default function Preview() {
  const [, setLocation] = useLocation();
  const [iframeKey, setIframeKey] = useState(0);
  const [gridMode, setGridMode] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const { executionState, executionClient, setExecutionState, isRunning, setIsRunning } = useAppState();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const touchStartX = useRef(0);
  const [currentUrl, setCurrentUrl] = useState("localhost:5000");
  const [publicUrl, setPublicUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [urlInput, setUrlInput] = useState("http://localhost:5000");
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devToolsTab, setDevToolsTab] = useState<DevToolsTab>("console");
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [crashReason, setCrashReason] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastReloadType, setLastReloadType] = useState<"hot" | "hard" | null>(null);
  const [networkLogs, setNetworkLogs] = useState<any[]>([]);
  const lastPerfIndexRef = useRef<number>(0);
  const [devToolsMinimized, setDevToolsMinimized] = useState(false);
  const [devToolsHeight, setDevToolsHeight] = useState(280);
  const [networkMode, setNetworkMode] = useState<"normal" | "slow" | "offline">("normal");
  const [followSharedPreview, setFollowSharedPreview] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<{type: string; message: string; time: string}>>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragTypeRef = useRef<"right" | "bottom" | "corner" | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartWRef = useRef(0);
  const dragStartHRef = useRef(0);
  const [domElements, setDomElements] = useState<string>("");
  const [networkRequests, setNetworkRequests] = useState<Array<{method: string; url: string; status: string; type: string; time: string}>>([]);
  const navigationHistoryRef = useRef<string[]>(["localhost:5000"]);
  const navigationIndexRef = useRef(0);
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<ElementInfo | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceKey>("fullsize");
  const devicePopupRef = useRef<HTMLDivElement>(null);
  const [showDevicePopup, setShowDevicePopup] = useState(false);
  const [showDevUrlPopup, setShowDevUrlPopup] = useState(false);
  const [privateDevUrl, setPrivateDevUrl] = useState(false);
  const [copiedDevLink, setCopiedDevLink] = useState(false);
  const devUrlPopupRef = useRef<HTMLDivElement>(null);

  /* ── Status Overlay State ── */
  const STATUS_MESSAGES = [
    "Initializing...",
    "Agent writing code...",
    "Fixing bugs...",
    "Publishing changes...",
    "Deploying...",
    "Optimizing performance...",
    "Finalizing build...",
  ];
  type AppState = "idle" | "building" | "running" | "error";
  const [appState, setAppState] = useState<AppState>("building");
  const [statusMsgIndex, setStatusMsgIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(true);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Processing Pulse Animation State ── */
  const CONSOLE_MESSAGES = [
    "console.run() → success",
    "Fixing bug #4821...",
    "Server reset complete",
    "Hot reload triggered",
    "Building modules...",
    "Resolving dependencies...",
    "Compiling TypeScript...",
    "Optimizing bundle...",
    "Syncing filesystem...",
    "Agent writing code...",
    "Running test suite...",
    "Deploying changes...",
    "I am fixing bugs...",
    "Starting dev server...",
    "Watching for changes...",
  ];
  const [pulseStatusIndex, setPulseStatusIndex] = useState(0);

  // Typing animation
  useEffect(() => {
    const target = appState === "error"
      ? "Error occurred! Check logs."
      : appState === "running"
      ? "Ready"
      : STATUS_MESSAGES[statusMsgIndex] ?? "Initializing...";
    let i = 0;
    setTypedText("");
    const tick = () => {
      i++;
      setTypedText(target.slice(0, i));
      if (i < target.length) typingRef.current = setTimeout(tick, 28);
    };
    typingRef.current = setTimeout(tick, 60);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [statusMsgIndex, appState]);

  // Cycle status messages while building
  useEffect(() => {
    if (appState !== "building") return;
    const iv = setInterval(() => {
      setStatusMsgIndex(i => (i + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(iv);
  }, [appState]);

  // Cycle processing pulse console messages (always running)
  useEffect(() => {
    const iv = setInterval(() => {
      setPulseStatusIndex(i => (i + 1) % CONSOLE_MESSAGES.length);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  // Drive appState from executionState / isRunning
  useEffect(() => {
    if (executionState.errors.length > 0) {
      setAppState("error");
      setOverlayVisible(true);
    } else if (isRunning) {
      setAppState("building");
      setOverlayVisible(true);
    } else {
      setAppState("running");
      setOverlayVisible(true);
      const t = setTimeout(() => setOverlayVisible(false), 3500);
      return () => clearTimeout(t);
    }
  }, [isRunning, executionState.errors.length]);

  // Boot sequence on first load
  useEffect(() => {
    setAppState("building");
    setOverlayVisible(true);
    const t = setTimeout(() => {
      setAppState("running");
      const t2 = setTimeout(() => setOverlayVisible(false), 3000);
      return () => clearTimeout(t2);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const handleOverlayRun = () => {
    setAppState("building");
    setStatusMsgIndex(0);
    setOverlayVisible(true);
    setIsRunning(true);
    handleHardRestart();
    setTimeout(() => {
      setIsRunning(false);
    }, 5500);
  };

  const hasErrors = executionState.errors.length > 0;

  const crashScreen = !isRunning ? (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: "#111213",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "clamp(6px, 3%, 16px)",
      padding: "8px",
      overflow: "hidden",
    }}>
      <MonitorX style={{ width: "clamp(28px, 18%, 52px)", height: "clamp(28px, 18%, 52px)", color: "rgba(200,200,200,0.75)", strokeWidth: 1.4, flexShrink: 0 }} />
      <span style={{ color: "#fff", fontSize: "clamp(9px, 4%, 14px)", fontWeight: 700, textAlign: "center", lineHeight: 1.25, whiteSpace: "nowrap" }}>
        Your app is not running
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 2%, 8px)", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={handleOverlayRun}
          style={{
            background: "#22c55e", color: "#fff", borderRadius: 5, border: "none",
            padding: "clamp(4px, 2%, 7px) clamp(8px, 4%, 14px)",
            display: "flex", alignItems: "center", gap: "clamp(3px, 2%, 6px)",
            fontWeight: 700, fontSize: "clamp(9px, 3.5%, 13px)", cursor: "pointer", lineHeight: 1, flexShrink: 0,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <polygon points="1.5,0.8 9.2,5 1.5,9.2" fill="#fff" />
          </svg>
          Run
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(8px, 3.5%, 12px)", whiteSpace: "nowrap" }}>to preview your app.</span>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then(reg => {
        if (reg.active) {
          reg.active.postMessage({ type: "SET_NET_MODE", mode: networkMode });
        }
      })
      .catch(() => {});
  }, [networkMode]);


  const publishPreviewState = async (partial?: Partial<{ url: string; deviceType: string; devToolsTab: string; gridMode: boolean; }>) => {
    try {
      const body = {
        url: partial?.url ?? currentUrl,
        deviceType: partial?.deviceType ?? deviceType,
        devToolsTab: partial?.devToolsTab ?? devToolsTab,
        gridMode: partial?.gridMode ?? gridMode,
      };
      await fetch("/api/preview-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {}
  };

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
        if (data.deviceType) {
          setDeviceType(data.deviceType as any);
        }
        if (data.devToolsTab) {
          setDevToolsTab(data.devToolsTab as any);
        }
        if (typeof data.gridMode === "boolean") {
          setGridMode(data.gridMode);
        }
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, [followSharedPreview]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const win = iframeRef.current?.contentWindow as any;
        if (!win || !win.performance) return;
        const entries = win.performance.getEntriesByType("resource") || [];
        const start = lastPerfIndexRef.current;
        const fresh = entries.slice(start);
        if (fresh.length > 0) {
          lastPerfIndexRef.current = entries.length;
          const mapped = fresh.map((e: any) => ({
            name: e.name,
            initiatorType: e.initiatorType,
            duration: Math.round(e.duration),
            transferSize: e.transferSize || 0,
          }));
          setNetworkLogs((prev) => [...mapped, ...prev].slice(0, 200));
        }
      } catch {}
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/project-status");
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.running)) {
          setIsExecuting(data.running.length > 0);
        }
      } catch (e) {
        console.error("Status sync failed", e);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    // Use Replit dev domain if available, otherwise use current host
    const replitDevDomain = import.meta.env.VITE_REPLIT_DEV_DOMAIN;
    const domain = replitDevDomain || window.location.host || "localhost:5000";
    setPublicUrl(domain);
  }, []);


  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/preview-sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const fetchTunnelInfo = async () => {
      try {
        const res = await fetch("/api/tunnel-info");
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.ok && data.url) {
          // Prefer full URL for iframe, but keep hostname:port style for display/navigation history
          try {
            const urlObj = new URL(data.url);
            const hostPortPath = `${urlObj.hostname}${urlObj.port ? ":" + urlObj.port : ""}${urlObj.pathname}`;
            setPublicUrl(hostPortPath);
          } catch {
            // Fallback: assume already host:port
            setPublicUrl(data.url);
          }
        }
      } catch (e) {
        console.error("Failed to load tunnel info", e);
      }
    };
    fetchTunnelInfo();
  }, []);


  useEffect(() => {
    if (!autoReloadEnabled) return;

    if (executionState.status === "completed" || executionState.status === "error") {
        setCrashReason("Last crash at " + new Date().toLocaleTimeString());
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      setLastReloadType("hot");
      }
    }
  }, [executionState.status, autoReloadEnabled]);

  // --- Inspect Element: listen for postMessage from injected iframe script ---
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "inspect-element-select") {
        const d = e.data.payload as ElementInfo;
        setSelectedElementInfo(d);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // --- Inspect Element: inject/remove highlight script into iframe ---
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const SCRIPT_ID = "__replit_inspect__";

    const inject = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        if (doc.getElementById(SCRIPT_ID)) return;

        const script = doc.createElement("script");
        script.id = SCRIPT_ID;
        script.textContent = `
(function() {
  var _hovered = null;
  var _prevOutline = null;
  var _prevOutlineOffset = null;

  function getStyles(el) {
    var cs = window.getComputedStyle(el);
    var keys = ["display","position","width","height","padding","margin","border","background","color","font-size","font-family","flex","grid","overflow","z-index","opacity","border-radius","box-shadow","line-height"];
    var result = {};
    keys.forEach(function(k){ result[k] = cs.getPropertyValue(k); });
    return result;
  }

  function getAttrs(el) {
    var out = {};
    for(var i = 0; i < el.attributes.length; i++){
      out[el.attributes[i].name] = el.attributes[i].value;
    }
    return out;
  }

  function onMouseOver(e) {
    if(_hovered && _hovered !== e.target) {
      _hovered.style.outline = _prevOutline;
      _hovered.style.outlineOffset = _prevOutlineOffset;
    }
    _hovered = e.target;
    _prevOutline = _hovered.style.outline;
    _prevOutlineOffset = _hovered.style.outlineOffset;
    _hovered.style.outline = '2px solid #6c8ef5';
    _hovered.style.outlineOffset = '1px';
    e.stopPropagation();
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    var rect = el.getBoundingClientRect();
    var data = {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: Array.from(el.classList),
      rect: { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), left: Math.round(rect.left) },
      styles: getStyles(el),
      attributes: getAttrs(el)
    };
    window.parent.postMessage({ type: 'inspect-element-select', payload: data }, '*');
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);

  window.__removeInspect__ = function() {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    if(_hovered) { _hovered.style.outline = _prevOutline; _hovered.style.outlineOffset = _prevOutlineOffset; }
  };
})();
        `;
        doc.head.appendChild(script);
      } catch (_) {}
    };

    const remove = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const s = doc.getElementById(SCRIPT_ID);
        if (s) s.remove();
        const w = iframe.contentWindow as any;
        if (w?.__removeInspect__) w.__removeInspect__();
      } catch (_) {}
    };

    if (inspectMode) {
      inject();
    } else {
      remove();
      setSelectedElementInfo(null);
    }
  }, [inspectMode]);

  const handleSelectDevice = (key: DeviceKey) => {
    setSelectedDevice(key);
    setShowDevicePopup(false);
    const cfg = DEVICE_CONFIGS[key];
    if (key === "fullsize") {
      setDeviceType("desktop");
      setCustomWidth(null);
      setCustomHeight(null);
      setIsExecuting(true);
    } else if (cfg.frame === "tablet") {
      setDeviceType("desktop");
      setCustomWidth(null);
      setCustomHeight(null);
      setIsExecuting(true);
    } else if (cfg.frame === "phone") {
      setDeviceType("iphone");
      setCustomWidth(null);
      setCustomHeight(null);
    } else {
      setDeviceType("desktop");
      setCustomWidth(cfg.width ? parseInt(cfg.width) : null);
      setCustomHeight(cfg.height ? parseInt(cfg.height) : null);
    }
  };

  useEffect(() => {
    if (!showDevicePopup) return;
    const handler = (e: MouseEvent) => {
      if (devicePopupRef.current && !devicePopupRef.current.contains(e.target as Node)) {
        setShowDevicePopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDevicePopup]);

  useEffect(() => {
    if (!showDevUrlPopup) return;
    const handler = (e: MouseEvent) => {
      if (devUrlPopupRef.current && !devUrlPopupRef.current.contains(e.target as Node)) {
        setShowDevUrlPopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDevUrlPopup]);

  const handleIframeLoad = useCallback(() => {
    try {
      if (iframeRef.current?.contentWindow?.location) {
        const href = iframeRef.current.contentWindow.location.href;
        const url = new URL(href);
        const newUrl = `${url.hostname}${url.port ? ':' + url.port : ''}${url.pathname}`;
        setCurrentUrl(newUrl);
        
        // Track navigation history
        const currentIndex = navigationIndexRef.current;
        navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
        if (navigationHistoryRef.current[navigationHistoryRef.current.length - 1] !== newUrl) {
          navigationHistoryRef.current.push(newUrl);
          navigationIndexRef.current = navigationHistoryRef.current.length - 1;
        }
      }
    } catch (e) {
      // Cross-origin iframe - show domain-based URL
      setCurrentUrl(publicUrl);
    }
    // Hide loading overlay when page finishes loading
    setIsExecuting(false);
  }, [publicUrl]);
  useEffect(() => {
    const displayUrl = `http://${currentUrl || publicUrl || "localhost:5000"}`;
    setUrlInput(displayUrl);
  }, [currentUrl, publicUrl]);

  const handleUrlInputSubmit = (e: FormEvent) => {
    e.preventDefault();
    let value = urlInput.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      value = `http://${value}`;
    }
    try {
      const urlObj = new URL(value);
      const newUrl = `${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}${urlObj.pathname}`;
      if (iframeRef.current) {
        iframeRef.current.src = value;
      }
      setCurrentUrl(newUrl);
      // Update navigation history when navigating via URL bar
      const currentIndex = navigationIndexRef.current;
      navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
      if (navigationHistoryRef.current[navigationHistoryRef.current.length - 1] !== newUrl) {
        navigationHistoryRef.current.push(newUrl);
        navigationIndexRef.current = navigationHistoryRef.current.length - 1;
      }
      setIsExecuting(true);
    } catch (err) {
      console.error('Invalid URL entered in preview bar', err);
    }
  };


  const handleNavigateBack = useCallback(() => {
    if (navigationIndexRef.current > 0) {
      navigationIndexRef.current--;
      const url = navigationHistoryRef.current[navigationIndexRef.current];
      if (iframeRef.current && url) {
        iframeRef.current.src = `http://${url}`;
      }
    }
  }, []);

  const handleNavigateForward = useCallback(() => {
    if (navigationIndexRef.current < navigationHistoryRef.current.length - 1) {
      navigationIndexRef.current++;
      const url = navigationHistoryRef.current[navigationIndexRef.current];
      if (iframeRef.current && url) {
        iframeRef.current.src = `http://${url}`;
      }
    }
  }, []);

  // Hard restart handler - calls backend restart API and reloads iframe
  const handleHardRestart = async () => {
    try {
      setIsExecuting(true);
      await fetch("/api/restart", { method: "POST" });
    } catch (e) {
      console.error("Failed to restart preview server", e);
    } finally {
      if (iframeRef.current) {
      setLastReloadType("hard");
        iframeRef.current.src = iframeRef.current.src;
      setLastReloadType("hot");
      }
      setIsExecuting(false);
    }
  };

const handleCopyUrl = () => {
    const urlToCopy = `http://${publicUrl || currentUrl || "localhost:5000"}`;
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPageIndex < 3) {
        setCurrentPageIndex(currentPageIndex + 1);
      } else if (diff < 0 && currentPageIndex > 0) {
        setCurrentPageIndex(currentPageIndex - 1);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchEndX = e.touches[0].clientX;
    const diff = Math.abs(touchStartX.current - touchEndX);
    
    if (diff < 20) {
      return;
    }
  };

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


  const handlePlayClick = () => {
    // Just toggle running state like Agent page does
    setIsExecuting(!isExecuting);
  };

  const getDeviceStyles = () => {
    const cfg = DEVICE_CONFIGS[selectedDevice];
    if (cfg && cfg.width && cfg.height && selectedDevice !== "fullsize" && selectedDevice !== "16:9") {
      return { width: cfg.width, height: cfg.height };
    }
    switch (deviceType) {
      case "iphone":
        return { width: "375px", height: "667px" };
      case "ipad":
        return { width: "768px", height: "1024px" };
      case "android":
        return { width: "360px", height: "640px" };
      default:
        return { width: "100%", height: "100%" };
    }
  };

  const handleResizeDragStart = (e: React.MouseEvent, type: "right" | "bottom" | "corner") => {
    e.preventDefault();
    const container = previewContainerRef.current;
    if (!container) return;
    dragTypeRef.current = type;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    dragStartWRef.current = customWidth ?? container.offsetWidth;
    dragStartHRef.current = customHeight ?? container.offsetHeight;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartXRef.current;
      const dy = ev.clientY - dragStartYRef.current;
      if (dragTypeRef.current === "right" || dragTypeRef.current === "corner") {
        setCustomWidth(Math.max(280, dragStartWRef.current + dx));
      }
      if (dragTypeRef.current === "bottom" || dragTypeRef.current === "corner") {
        setCustomHeight(Math.max(200, dragStartHRef.current + dy));
      }
    };
    const onUp = () => {
      dragTypeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!iframeRef.current) return;
    
    const setupConsoleCapture = () => {
      try {
        const iframeWindow = iframeRef.current?.contentWindow as any;
        const iframeDoc = iframeRef.current?.contentDocument;
        
        if (!iframeWindow) return;
        
        const getTime = () => new Date().toLocaleTimeString();

        // Capture console methods
        if (iframeWindow?.console) {
          const originalLog = iframeWindow.console.log;
          const originalError = iframeWindow.console.error;
          const originalWarn = iframeWindow.console.warn;
          const originalInfo = iframeWindow.console.info;

          iframeWindow.console.log = function(...args: any[]) {
            originalLog?.apply(iframeWindow.console, args);
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(" ");
            setConsoleLogs(prev => [...prev, { type: "log", message, time: getTime() }]);
          };

          iframeWindow.console.error = function(...args: any[]) {
            originalError?.apply(iframeWindow.console, args);
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(" ");
            setConsoleLogs(prev => [...prev, { type: "error", message, time: getTime() }]);
          };

          iframeWindow.console.warn = function(...args: any[]) {
            originalWarn?.apply(iframeWindow.console, args);
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(" ");
            setConsoleLogs(prev => [...prev, { type: "warn", message, time: getTime() }]);
          };

          iframeWindow.console.info = function(...args: any[]) {
            originalInfo?.apply(iframeWindow.console, args);
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(" ");
            setConsoleLogs(prev => [...prev, { type: "info", message, time: getTime() }]);
          };
        }

        // Monitor DOM changes for Elements tab
        if (iframeDoc) {
          const observer = new MutationObserver(() => {
            const htmlStr = iframeDoc.documentElement.outerHTML.substring(0, 2500);
            setDomElements(htmlStr);
          });
          observer.observe(iframeDoc.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true
          });
          return () => observer.disconnect();
        }
      } catch (e) {
        console.error("Failed to setup console capture:", e);
      }
    };

    // Setup console capture immediately
    setupConsoleCapture();

    // Also setup on iframe load
    const handleLoad = () => {
      setupConsoleCapture();
    };

    if (iframeRef.current) {
      iframeRef.current.addEventListener('load', handleLoad);
      return () => iframeRef.current?.removeEventListener('load', handleLoad);
    }
  }, []);

  // Separate effect for network monitoring
  useEffect(() => {
    if (!iframeRef.current) return;

    const setupNetworkCapture = () => {
      try {
        const iframeWindow = iframeRef.current?.contentWindow as any;
        if (!iframeWindow) return;

        const getTime = () => new Date().toLocaleTimeString();

        // Intercept fetch
        if (iframeWindow?.fetch) {
          const originalFetch = iframeWindow.fetch;
          iframeWindow.fetch = async function(url: any, options?: any) {
            const method = (options?.method || "GET").toUpperCase();
            const urlStr = typeof url === "string" ? url : url.toString();
            const time = getTime();
            
            try {
              const response = await originalFetch(url, options);
              const status = response.status;
              const contentType = response.headers.get("content-type") || "application/octet-stream";
              setNetworkRequests(prev => [...prev, {
                method,
                url: urlStr.split("?")[0],
                status: status.toString(),
                type: contentType,
                time
              }]);
              return response;
            } catch (e) {
              setNetworkRequests(prev => [...prev, {
                method,
                url: urlStr,
                status: "error",
                type: "failed",
                time
              }]);
              throw e;
            }
          };
        }

        // Intercept XMLHttpRequest
        if (iframeWindow?.XMLHttpRequest) {
          const OriginalXHR = iframeWindow.XMLHttpRequest;
          const newXHR = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            let method = "", url = "";
            const time = getTime();

            xhr.open = function(meth: string, u: string, ...args: any) {
              method = meth;
              url = u;
              return originalOpen.apply(xhr, [meth, u, ...args]);
            };

            xhr.send = function(...args: any) {
              const onReadyStateChange = xhr.onreadystatechange;
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  setNetworkRequests(prev => [...prev, {
                    method,
                    url: url.split("?")[0],
                    status: xhr.status.toString(),
                    type: xhr.getResponseHeader("content-type") || "application/octet-stream",
                    time
                  }]);
                }
                onReadyStateChange?.apply(xhr, arguments);
              };
              return originalSend.apply(xhr, args);
            };

            return xhr;
          };
          iframeWindow.XMLHttpRequest = newXHR;
        }
      } catch (e) {
        console.error("Failed to setup network capture:", e);
      }
    };

    setupNetworkCapture();

    const handleLoad = () => {
      setupNetworkCapture();
    };

    if (iframeRef.current) {
      iframeRef.current.addEventListener('load', handleLoad);
      return () => iframeRef.current?.removeEventListener('load', handleLoad);
    }
  }, []);

  // AGENT PREVIEW AUTO REFRESH
  useEffect(() => {
    const es = new EventSource("/sse/console");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.type === "done") {
          setIframeKey((k: number) => k + 1);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  // FILE EXPLORER AUTO RELOAD
  useEffect(() => {
    const handler = () => {
      setIframeKey((k: number) => k + 1);
    };
    window.addEventListener("file-refresh", handler);
    return () => window.removeEventListener("file-refresh", handler);
  }, []);

  const renderGridModeContent = () => {
    if (currentPageIndex === 0) {
      return <GridConsolePage />;
    } else if (currentPageIndex === 1) {
      return <GridAgentPage />;
    } else if (currentPageIndex === 2) {
      return <GridPreviewPage />;
    } else if (currentPageIndex === 3) {
      return <GridPublishingPage />;
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-screen bg-black overflow-hidden transition-all duration-300 ease-in-out ${
      gridMode ? "translate-y-[-40px]" : "translate-y-0"
    }`}>
      {gridMode && <div className="fixed inset-0 bg-black/40 z-20 pointer-events-none" />}
      
      <div className={`flex-1 flex flex-col overflow-hidden ${gridMode ? "mx-2 sm:mx-4 my-4 rounded-t-2xl sm:rounded-t-3xl border-2 border-gray-700 bg-black" : ""}`} onTouchStart={gridMode ? handleTouchStart : undefined} onTouchEnd={gridMode ? handleTouchEnd : undefined} onTouchMove={gridMode ? handleTouchMove : undefined}>
        {!gridMode ? (
          <>
            {/* Header */}
            <header className="bg-black border-b border-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                {crashReason && (
                  <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {crashReason}
                  </span>
                )}
                {lastAction && (
                  <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {lastAction}
                  </span>
                )}
                {lastReloadType && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${lastReloadType === "hot" ? "bg-green-600 text-white" : "bg-yellow-500 text-black"}`}>
                    {lastReloadType === "hot" ? "Hot Reload" : "Server Restart"}
                  </span>
                )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs font-medium">Publish</span>
                  </div>
                  <div className="w-0.5 h-4 bg-gray-600"></div>
                  <div className="flex items-center gap-1.5">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-200 text-sm font-medium">Preview</span>
                  </div>
                </div>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg"
                      data-testid="button-menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem data-testid="menu-settings">
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-keyboard">
                      <Keyboard className="h-4 w-4 mr-2" />
                      <span>Keyboard Shortcuts</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem data-testid="menu-help">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      <span>Help & Support</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Browser Bar */}
            <div className="bg-black border-b border-gray-700 px-3 sm:px-4 py-2 flex-shrink-0 relative z-50">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="button-back-nav"
                  onClick={handleNavigateBack}
                  disabled={navigationIndexRef.current <= 0}
                  title="Go back"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="button-forward-nav"
                  onClick={handleNavigateForward}
                  disabled={navigationIndexRef.current >= navigationHistoryRef.current.length - 1}
                  title="Go forward"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-transform hover:rotate-180 duration-300"
                  data-testid="button-refresh"
                  onClick={() => {
                    setIsExecuting(true);
                    setConsoleLogs([]);
                    setNetworkRequests([]);
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src;
                      setLastReloadType("hot");
                    }
                  }}
                  title="Refresh preview"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>

                {/* Dev URL popup anchor */}
                <div className="relative" ref={devUrlPopupRef}>
                  <button
                    onClick={() => setShowDevUrlPopup(v => !v)}
                    className="flex items-center justify-center h-7 w-7 rounded transition-all duration-150 hover:bg-gray-700 flex-shrink-0 text-gray-400 hover:text-gray-200"
                    title="Dev URL settings"
                    data-testid="button-dev-url-chain"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>

                  {showDevUrlPopup && (() => {
                    const devUrl = publicUrl
                      ? `https://${publicUrl}`
                      : `http://localhost:5000`;
                    return (
                      <div
                        className="absolute left-0 top-full mt-1.5 z-50 rounded-lg overflow-hidden"
                        style={{
                          background: "#1a1d27",
                          border: "1px solid rgba(255,255,255,0.1)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                          width: "260px",
                        }}
                      >
                        {/* Private Dev URL */}
                        <div className="px-3 pt-3 pb-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[11.5px] font-semibold text-white">Private Dev URL</p>
                            <button
                              onClick={() => setPrivateDevUrl(v => !v)}
                              className="relative flex-shrink-0 rounded-full transition-all duration-300"
                              style={{
                                minWidth: "32px", width: "32px", height: "18px",
                                background: privateDevUrl ? "#3b82f6" : "rgba(255,255,255,0.15)",
                              }}
                              data-testid="toggle-private-dev-url"
                            >
                              <span
                                className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-300"
                                style={{ left: privateDevUrl ? "calc(100% - 16px)" : "1px", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                              />
                            </button>
                          </div>
                          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(148,163,184,0.65)" }}>
                            {privateDevUrl
                              ? "Only authenticated editors can access the Dev URL."
                              : "Anyone with the Dev URL can access your app preview."}
                          </p>
                        </div>

                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

                        {/* Port */}
                        <div className="px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10.5px] font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>Port:</span>
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" style={{ boxShadow: "0 0 4px rgba(59,130,246,0.8)" }} />
                            <span className="text-[11px] font-mono font-semibold text-white">:5000 → :80</span>
                          </div>
                          <button
                            className="p-0.5 rounded transition-colors hover:bg-gray-700"
                            style={{ color: "rgba(148,163,184,0.5)" }}
                            title="Port settings"
                            data-testid="button-port-settings"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                        </div>

                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

                        {/* URL + copy */}
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={devUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-[10px] font-mono truncate hover:underline"
                              style={{ color: "#4ade80" }}
                              data-testid="link-dev-url"
                            >
                              {devUrl}
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(devUrl);
                                setCopiedDevLink(true);
                                setTimeout(() => setCopiedDevLink(false), 2000);
                              }}
                              className="flex-shrink-0 p-1 rounded transition-all duration-150 hover:bg-gray-700"
                              style={{ color: copiedDevLink ? "#4ade80" : "rgba(148,163,184,0.55)" }}
                              title="Copy URL"
                              data-testid="button-copy-dev-url"
                            >
                              {copiedDevLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                          <p className="text-[9.5px] mt-1" style={{ color: "rgba(100,116,139,0.6)" }}>
                            Temporary — sleeps when you leave.
                          </p>
                        </div>

                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

                        {/* QR code */}
                        <div className="px-3 py-2">
                          <div className="p-1.5 rounded bg-white inline-block">
                            <QRCodeSVG value={devUrl} size={80} bgColor="#ffffff" fgColor="#000000" level="M" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1 flex items-center bg-black rounded px-2.5 py-1 min-w-0 mx-1">
                  <form className="w-full" onSubmit={handleUrlInputSubmit}>
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full h-6 bg-transparent border-none px-0 text-[11px] text-gray-300 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                      data-testid="input-preview-url"
                      spellCheck={false}
                    />
                  </form>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-7 w-7 rounded ${devToolsOpen ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"}`}
                  onClick={() => setDevToolsOpen(!devToolsOpen)}
                  data-testid="button-devtools"
                  title="Developer tools"
                >
                  <Wrench className="h-3.5 w-3.5" />
                </Button>

                {/* Device selector */}
                <div className="relative" ref={devicePopupRef}>
                  <button
                    className="flex items-center gap-1 px-2 h-7 rounded cursor-pointer"
                    style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
                    data-testid="device-indicator"
                    title={DEVICE_CONFIGS[selectedDevice]?.label ?? "Device"}
                    onClick={() => setShowDevicePopup(v => !v)}
                  >
                    <Monitor className="h-3 w-3 text-blue-400" />
                  </button>

                  {showDevicePopup && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden py-1"
                      style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 180 }}
                    >
                      {DEVICE_GROUPS.map(group => (
                        <div key={group.groupLabel}>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            {group.groupLabel}
                          </div>
                          {group.keys.map(key => (
                            <button
                              key={key}
                              className="w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between gap-2 hover:bg-white/5 transition-colors"
                              style={{ color: selectedDevice === key ? "#60a5fa" : "#d1d5db" }}
                              onClick={() => handleSelectDevice(key)}
                            >
                              <span>{DEVICE_CONFIGS[key].label}</span>
                              {DEVICE_CONFIGS[key].dims && (
                                <span className="text-[10px] text-gray-500">{DEVICE_CONFIGS[key].dims}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon" onClick={() => window.open(`http://${publicUrl || currentUrl || "localhost:5000"}`, "_blank")} className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded" data-testid="button-open-external" title="Open in new tab">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <main className={`flex-1 overflow-hidden bg-black relative flex flex-col ${devToolsOpen ? "" : ""}`}>

              {/* ══════════════ STATUS OVERLAY SYSTEM ══════════════ */}
              <style>{`
                @keyframes so-orbit1 { from{transform:rotate(0deg) translateX(16px) rotate(0deg)} to{transform:rotate(360deg) translateX(16px) rotate(-360deg)} }
                @keyframes so-orbit2 { from{transform:rotate(120deg) translateX(11px) rotate(-120deg)} to{transform:rotate(480deg) translateX(11px) rotate(-480deg)} }
                @keyframes so-orbit3 { from{transform:rotate(240deg) translateX(7px) rotate(-240deg)} to{transform:rotate(600deg) translateX(7px) rotate(-600deg)} }
                @keyframes so-brain-pulse { 0%,100%{opacity:0.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
                @keyframes so-node-twinkle { 0%,100%{opacity:0.4;r:1.5} 50%{opacity:1;r:2.2} }
                @keyframes so-glow-pulse {
                  0%,100%{box-shadow:0 0 14px 3px rgba(99,102,241,0.5),0 0 32px 6px rgba(139,92,246,0.26),0 4px 24px rgba(0,0,0,0.55)}
                  50%{box-shadow:0 0 26px 8px rgba(99,102,241,0.8),0 0 56px 14px rgba(139,92,246,0.42),0 4px 28px rgba(0,0,0,0.6)}
                }
                @keyframes so-border-glow {
                  0%{border-color:rgba(99,102,241,0.45)}
                  33%{border-color:rgba(139,92,246,0.6)}
                  66%{border-color:rgba(167,139,250,0.55)}
                  100%{border-color:rgba(99,102,241,0.45)}
                }
                @keyframes so-err-pulse {
                  0%,100%{box-shadow:0 0 12px 3px rgba(239,68,68,0.45),0 0 28px 6px rgba(239,68,68,0.22),0 4px 20px rgba(0,0,0,0.6)}
                  50%{box-shadow:0 0 22px 8px rgba(239,68,68,0.72),0 0 48px 12px rgba(239,68,68,0.35),0 4px 24px rgba(0,0,0,0.65)}
                }
                @keyframes so-ok-pulse {
                  0%,100%{box-shadow:0 0 12px 3px rgba(34,197,94,0.45),0 0 28px 5px rgba(34,197,94,0.20),0 4px 20px rgba(0,0,0,0.55)}
                  50%{box-shadow:0 0 22px 7px rgba(34,197,94,0.70),0 0 44px 10px rgba(34,197,94,0.32),0 4px 24px rgba(0,0,0,0.6)}
                }
                @keyframes so-slide-up { from{opacity:0;transform:translateX(-50%) translateY(18px) scale(0.94)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
                @keyframes so-fade-in { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
                @keyframes so-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes so-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }
                @keyframes so-particle {
                  0%{transform:translate(0,0) scale(1);opacity:0.85}
                  60%{opacity:0.4}
                  100%{transform:translate(var(--px),var(--py)) scale(0.3);opacity:0}
                }
                @keyframes so-shake {
                  0%,100%{transform:translateX(-50%) translateY(0)}
                  15%{transform:translateX(calc(-50% - 4px)) translateY(0)}
                  30%{transform:translateX(calc(-50% + 4px)) translateY(0)}
                  45%{transform:translateX(calc(-50% - 3px)) translateY(0)}
                  60%{transform:translateX(calc(-50% + 3px)) translateY(0)}
                  75%{transform:translateX(calc(-50% - 1px)) translateY(0)}
                }
                @keyframes so-ring-out { 0%{transform:scale(1);opacity:0.65} 100%{transform:scale(2.6);opacity:0} }
                @keyframes so-ring-out-slow { 0%{transform:scale(1);opacity:0.45} 100%{transform:scale(3.2);opacity:0} }
                @keyframes so-check { from{stroke-dashoffset:22} to{stroke-dashoffset:0} }
                @keyframes so-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes so-icon-bg {
                  0%{background:linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.22))}
                  50%{background:linear-gradient(135deg,rgba(139,92,246,0.32),rgba(167,139,250,0.26))}
                  100%{background:linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.22))}
                }
                @keyframes so-live-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.35);opacity:0.75} }
                @keyframes so-data-line {
                  0%{stroke-dashoffset:20;opacity:0}
                  30%{opacity:1}
                  100%{stroke-dashoffset:0;opacity:0.6}
                }
                @keyframes pp-node-pulse {
                  0%,100%{opacity:0.55;transform:scale(1)}
                  50%{opacity:1;transform:scale(1.3)}
                }
                @keyframes pp-line-flow {
                  0%{stroke-dashoffset:30;opacity:0.15}
                  45%{opacity:0.75}
                  100%{stroke-dashoffset:0;opacity:0.15}
                }
                @keyframes pp-glow-ring {
                  0%,100%{filter:drop-shadow(0 0 6px rgba(99,102,241,0.55)) drop-shadow(0 0 18px rgba(139,92,246,0.28))}
                  50%{filter:drop-shadow(0 0 14px rgba(99,102,241,0.9)) drop-shadow(0 0 36px rgba(139,92,246,0.55))}
                }
                @keyframes pp-float {
                  0%,100%{transform:translateY(0px)}
                  50%{transform:translateY(-7px)}
                }
                @keyframes pp-msg-in {
                  from{opacity:0;transform:translateY(5px)}
                  to{opacity:1;transform:translateY(0)}
                }
                @keyframes pp-outer-ring {
                  0%{transform:scale(1);opacity:0.5}
                  100%{transform:scale(2.2);opacity:0}
                }
              `}</style>

              {/* ── Bottom-center floating overlay (building / running / error) ── */}
              {false && overlayVisible && (
                <div style={{
                  position: "absolute",
                  bottom: "clamp(16px,3.5%,32px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 70,
                  animation: appState === "error"
                    ? "so-shake 0.5s 0.05s ease both"
                    : "so-slide-up 0.36s cubic-bezier(0.22,1,0.36,1) both",
                  maxWidth: "calc(100% - 24px)",
                  pointerEvents: appState === "error" ? "auto" : "none",
                }}>

                  {/* ─── BUILDING STATE ─── */}
                  {appState === "building" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "11px 20px 11px 13px",
                      borderRadius: 16,
                      background: "rgba(9,10,20,0.90)",
                      border: "1px solid rgba(99,102,241,0.42)",
                      backdropFilter: "blur(18px) saturate(180%)",
                      WebkitBackdropFilter: "blur(18px) saturate(180%)",
                      boxShadow: "0 0 0 1px rgba(99,102,241,0.08)",
                      animation: "so-glow-pulse 2.6s ease-in-out infinite, so-border-glow 4s linear infinite",
                      whiteSpace: "nowrap",
                    }}>

                      {/* AI Brain Icon zone */}
                      <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>

                        {/* Outer pulse ring 1 */}
                        <div style={{
                          position: "absolute", inset: -7, borderRadius: "50%",
                          border: "1px solid rgba(99,102,241,0.28)",
                          animation: "so-ring-out 2.4s 0s ease-out infinite",
                        }} />
                        {/* Outer pulse ring 2 — offset */}
                        <div style={{
                          position: "absolute", inset: -7, borderRadius: "50%",
                          border: "1px solid rgba(139,92,246,0.20)",
                          animation: "so-ring-out-slow 3.2s 1.2s ease-out infinite",
                        }} />

                        {/* Main icon circle */}
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          border: "1.5px solid rgba(99,102,241,0.55)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative", overflow: "hidden",
                          animation: "so-icon-bg 3s ease-in-out infinite",
                        }}>
                          {/* Subtle inner shimmer */}
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)",
                            borderRadius: "50%",
                            pointerEvents: "none",
                          }} />

                          {/* Neural network SVG */}
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                            {/* Core center node */}
                            <circle cx="12" cy="12" r="2.8" fill="rgba(165,180,252,0.95)" style={{ animation: "so-brain-pulse 1.8s ease-in-out infinite" }} />
                            {/* Outer nodes */}
                            <circle cx="12" cy="3.5"  r="1.8" fill="rgba(139,92,246,0.82)" style={{ animation: "so-brain-pulse 1.5s 0s ease-in-out infinite" }} />
                            <circle cx="20.1" cy="7.5" r="1.8" fill="rgba(99,102,241,0.82)"  style={{ animation: "so-brain-pulse 1.5s 0.25s ease-in-out infinite" }} />
                            <circle cx="20.1" cy="16.5" r="1.8" fill="rgba(139,92,246,0.82)" style={{ animation: "so-brain-pulse 1.5s 0.5s ease-in-out infinite" }} />
                            <circle cx="12" cy="20.5" r="1.8" fill="rgba(99,102,241,0.82)"   style={{ animation: "so-brain-pulse 1.5s 0.75s ease-in-out infinite" }} />
                            <circle cx="3.9" cy="16.5" r="1.8" fill="rgba(139,92,246,0.82)"  style={{ animation: "so-brain-pulse 1.5s 1.0s ease-in-out infinite" }} />
                            <circle cx="3.9" cy="7.5"  r="1.8" fill="rgba(99,102,241,0.82)"  style={{ animation: "so-brain-pulse 1.5s 1.25s ease-in-out infinite" }} />
                            {/* Connecting lines with data-flow animation */}
                            <line x1="12" y1="9.2" x2="12" y2="5.3"   stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 0s ease-in-out infinite" }} />
                            <line x1="12" y1="9.2" x2="18.3" y2="8"   stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 0.3s ease-in-out infinite" }} />
                            <line x1="12" y1="9.2" x2="18.3" y2="16"  stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 0.6s ease-in-out infinite" }} />
                            <line x1="12" y1="14.8" x2="12" y2="18.7" stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 0.9s ease-in-out infinite" }} />
                            <line x1="12" y1="14.8" x2="5.7" y2="16"  stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 1.2s ease-in-out infinite" }} />
                            <line x1="12" y1="9.2"  x2="5.7" y2="8"   stroke="rgba(165,180,252,0.35)" strokeWidth="0.9" strokeDasharray="5 3" style={{ animation: "so-data-line 1.8s 1.5s ease-in-out infinite" }} />
                          </svg>

                          {/* Orbiting dots (3) */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{
                              position: "absolute", width: 5.5, height: 5.5, borderRadius: "50%",
                              background: "rgba(165,180,252,1)",
                              boxShadow: "0 0 8px 3px rgba(99,102,241,0.85), 0 0 16px 4px rgba(99,102,241,0.45)",
                              animation: "so-orbit1 1.5s linear infinite",
                            }} />
                            <div style={{
                              position: "absolute", width: 4, height: 4, borderRadius: "50%",
                              background: "rgba(196,181,253,0.9)",
                              boxShadow: "0 0 6px 2px rgba(139,92,246,0.7)",
                              animation: "so-orbit2 2.1s linear infinite",
                            }} />
                            <div style={{
                              position: "absolute", width: 3, height: 3, borderRadius: "50%",
                              background: "rgba(167,139,250,0.8)",
                              animation: "so-orbit3 3.0s linear infinite",
                            }} />
                          </div>
                        </div>

                        {/* Floating data particles */}
                        {([
                          {x:"12px",  y:"-14px", d:"0s",    size:3,   col:"rgba(139,92,246,0.8)"},
                          {x:"-14px", y:"5px",   d:"0.45s", size:2.5, col:"rgba(99,102,241,0.75)"},
                          {x:"13px",  y:"10px",  d:"0.9s",  size:2,   col:"rgba(167,139,250,0.7)"},
                          {x:"-8px",  y:"-11px", d:"1.35s", size:2.5, col:"rgba(139,92,246,0.8)"},
                          {x:"6px",   y:"13px",  d:"1.8s",  size:2,   col:"rgba(99,102,241,0.65)"},
                          {x:"-12px", y:"-4px",  d:"0.65s", size:1.8, col:"rgba(196,181,253,0.7)"},
                        ] as const).map((p, i) => (
                          <div key={i} style={{
                            position: "absolute", top: "50%", left: "50%",
                            width: p.size, height: p.size, borderRadius: "50%",
                            background: p.col,
                            boxShadow: `0 0 4px 1px ${p.col}`,
                            ["--px" as any]: p.x, ["--py" as any]: p.y,
                            animation: `so-particle 2.0s ${p.d} ease-out infinite`,
                            marginTop: -p.size / 2, marginLeft: -p.size / 2,
                          }} />
                        ))}
                      </div>

                      {/* Right: status text + progress bar */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                        {/* Typed text + cursor */}
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span
                            key={statusMsgIndex}
                            style={{
                              fontSize: "clamp(11.5px,1.5vw,13.5px)",
                              fontWeight: 600,
                              color: "rgba(199,210,254,0.98)",
                              letterSpacing: "0.015em",
                              animation: "so-fade-in 0.22s ease both",
                              fontFamily: "inherit",
                            }}
                          >
                            {typedText}
                          </span>
                          <span style={{
                            display: "inline-block",
                            width: 2, height: "1em",
                            background: "linear-gradient(180deg,rgba(165,180,252,0.9),rgba(139,92,246,0.7))",
                            verticalAlign: "middle",
                            borderRadius: 1,
                            animation: "so-cursor 1s step-end infinite",
                          }} />
                        </div>

                        {/* Dual-layer shimmer progress bar */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{
                            width: "clamp(130px,20vw,200px)", height: 3, borderRadius: 99,
                            background: "rgba(99,102,241,0.10)",
                            overflow: "hidden",
                            boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.08)",
                          }}>
                            <div style={{
                              height: "100%",
                              width: `${Math.round(((statusMsgIndex + 1) / STATUS_MESSAGES.length) * 100)}%`,
                              borderRadius: 99,
                              background: "linear-gradient(90deg,#4f46e5,#6366f1,#818cf8,#a5b4fc,#818cf8,#6366f1)",
                              backgroundSize: "200% 100%",
                              animation: "so-shimmer 1.2s linear infinite",
                              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                              boxShadow: "0 0 8px 1px rgba(99,102,241,0.6)",
                            }} />
                          </div>
                          {/* Step dots */}
                          <div style={{ display: "flex", gap: 3, paddingLeft: 1 }}>
                            {STATUS_MESSAGES.map((_, idx) => (
                              <div key={idx} style={{
                                width: 4, height: 4, borderRadius: "50%",
                                background: idx <= statusMsgIndex
                                  ? "rgba(99,102,241,0.85)"
                                  : "rgba(99,102,241,0.18)",
                                transition: "background 0.4s ease",
                                boxShadow: idx === statusMsgIndex ? "0 0 5px 1px rgba(99,102,241,0.7)" : "none",
                              }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── READY / RUNNING STATE ─── */}
                  {appState === "running" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 18px 10px 11px",
                      borderRadius: 16,
                      background: "rgba(5,16,10,0.92)",
                      border: "1px solid rgba(34,197,94,0.38)",
                      backdropFilter: "blur(18px) saturate(160%)",
                      WebkitBackdropFilter: "blur(18px) saturate(160%)",
                      boxShadow: "0 0 0 1px rgba(34,197,94,0.06)",
                      animation: "so-ok-pulse 2.8s ease-in-out infinite",
                      whiteSpace: "nowrap",
                    }}>
                      {/* Check icon circle */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                          position: "absolute", inset: -5, borderRadius: "50%",
                          border: "1px solid rgba(34,197,94,0.22)",
                          animation: "so-ring-out 2.2s ease-out infinite",
                        }} />
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: "linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.14))",
                          border: "1.5px solid rgba(34,197,94,0.48)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.3 L6 11 L13 4.5"
                              stroke="rgba(34,197,94,0.98)" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"
                              strokeDasharray="22" strokeDashoffset="22"
                              style={{ animation: "so-check 0.55s 0.1s cubic-bezier(0.22,1,0.36,1) forwards" }} />
                          </svg>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{
                            fontSize: "clamp(11.5px,1.5vw,13.5px)",
                            fontWeight: 600,
                            color: "rgba(134,239,172,0.98)",
                            animation: "so-fade-in 0.3s ease both",
                          }}>
                            {typedText}
                          </span>
                          <span style={{
                            display: "inline-block", width: 2, height: "1em",
                            background: "rgba(134,239,172,0.6)",
                            verticalAlign: "middle", borderRadius: 1,
                            animation: "so-cursor 1s step-end infinite",
                          }} />
                        </div>
                        <div style={{
                          fontSize: "clamp(10px,1.1vw,11px)",
                          color: "rgba(110,231,183,0.50)",
                          letterSpacing: "0.01em",
                        }}>
                          App is live and running
                        </div>
                      </div>

                      {/* Live indicator with rings */}
                      <div style={{ position: "relative", marginLeft: 6, flexShrink: 0, width: 10, height: 10 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: "rgba(34,197,94,0.95)",
                          boxShadow: "0 0 8px 2px rgba(34,197,94,0.7)",
                          animation: "so-live-dot 1.6s ease-in-out infinite",
                          position: "relative", zIndex: 1,
                        }} />
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: "50%",
                          background: "rgba(34,197,94,0.35)",
                          animation: "so-ring-out 2s ease-out infinite",
                        }} />
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: "50%",
                          background: "rgba(34,197,94,0.20)",
                          animation: "so-ring-out 2s 0.8s ease-out infinite",
                        }} />
                      </div>
                    </div>
                  )}

                  {/* ─── ERROR STATE ─── */}
                  {appState === "error" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 13,
                      padding: "11px 15px 11px 13px",
                      borderRadius: 16,
                      background: "rgba(16,5,5,0.94)",
                      border: "1px solid rgba(239,68,68,0.40)",
                      backdropFilter: "blur(18px) saturate(140%)",
                      WebkitBackdropFilter: "blur(18px) saturate(140%)",
                      boxShadow: "0 0 0 1px rgba(239,68,68,0.10)",
                      animation: "so-err-pulse 2.4s ease-in-out infinite",
                      whiteSpace: "nowrap",
                      pointerEvents: "auto",
                    }}>
                      {/* Error text block */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{
                          fontSize: "clamp(11.5px,1.4vw,13.5px)",
                          fontWeight: 700,
                          color: "rgba(252,165,165,0.98)",
                          letterSpacing: "0.01em",
                          animation: "so-fade-in 0.22s ease both",
                        }}>
                          {typedText}
                        </div>
                        <div style={{
                          fontSize: "clamp(10px,1.1vw,11px)",
                          color: "rgba(252,165,165,0.48)",
                          letterSpacing: "0.01em",
                        }}>
                          Your app crashed
                        </div>
                      </div>

                      {/* Green Run / Restart button */}
                      <button
                        data-testid="button-overlay-run"
                        onClick={handleOverlayRun}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 16px",
                          borderRadius: 10,
                          background: "rgba(34,197,94,0.14)",
                          border: "1px solid rgba(34,197,94,0.50)",
                          color: "rgba(134,239,172,0.98)",
                          fontSize: "clamp(10.5px,1.2vw,12.5px)",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.18s cubic-bezier(0.22,1,0.36,1)",
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                          boxShadow: "0 0 10px rgba(34,197,94,0.2)",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(34,197,94,0.28)";
                          e.currentTarget.style.transform = "scale(1.06)";
                          e.currentTarget.style.boxShadow = "0 0 18px rgba(34,197,94,0.45)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(34,197,94,0.14)";
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 0 10px rgba(34,197,94,0.2)";
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                          <polygon points="1.5,0.8 9.2,5 1.5,9.2" fill="rgba(134,239,172,0.98)" />
                        </svg>
                        Run
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════ PROCESSING PULSE ANIMATION (CENTER) ══════════════ */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "clamp(3px, 0.8vmin, 6px)",
                pointerEvents: "none",
                userSelect: "none",
                width: "clamp(44px, 9vmin, 68px)",
              }}>
                {/* Network node SVG */}
                <div style={{ animation: "pp-float 3.5s ease-in-out infinite", width: "100%" }}>
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 148 128"
                    fill="none"
                    style={{ animation: "pp-glow-ring 2.8s ease-in-out infinite", overflow: "visible", display: "block" }}
                  >
                    {/* ── Connection lines (pentagon outer ring) ── */}
                    <line x1="74" y1="10" x2="132" y2="52" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0s linear infinite" }} />
                    <line x1="132" y1="52" x2="110" y2="114" stroke="rgba(139,92,246,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0.35s linear infinite" }} />
                    <line x1="110" y1="114" x2="38" y2="114" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0.7s linear infinite" }} />
                    <line x1="38" y1="114" x2="16" y2="52" stroke="rgba(139,92,246,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 1.05s linear infinite" }} />
                    <line x1="16" y1="52" x2="74" y2="10" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 1.4s linear infinite" }} />
                    {/* ── Cross-diagonal lines (inner web) ── */}
                    <line x1="74" y1="10" x2="110" y2="114" stroke="rgba(167,139,250,0.55)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 0.6s linear infinite" }} />
                    <line x1="132" y1="52" x2="38" y2="114" stroke="rgba(167,139,250,0.55)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 1.1s linear infinite" }} />
                    <line x1="132" y1="52" x2="16" y2="52" stroke="rgba(167,139,250,0.45)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 1.6s linear infinite" }} />
                    <line x1="74" y1="10" x2="38" y2="114" stroke="rgba(167,139,250,0.45)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 2.1s linear infinite" }} />
                    <line x1="16" y1="52" x2="110" y2="114" stroke="rgba(167,139,250,0.40)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 2.6s linear infinite" }} />

                    {/* ── Nodes (5 pentagon vertices) ── */}
                    {/* Top center */}
                    <circle cx="74" cy="10" r="10" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.9)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0s ease-in-out infinite", transformOrigin: "74px 10px" }} />
                    <circle cx="74" cy="10" r="4.5" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 5px rgba(99,102,241,0.9))" }} />
                    {/* Right */}
                    <circle cx="132" cy="52" r="8.5" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.88)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0.4s ease-in-out infinite", transformOrigin: "132px 52px" }} />
                    <circle cx="132" cy="52" r="3.8" fill="rgba(196,181,253,1)" style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.9))" }} />
                    {/* Bottom right */}
                    <circle cx="110" cy="114" r="7.5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.85)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0.8s ease-in-out infinite", transformOrigin: "110px 114px" }} />
                    <circle cx="110" cy="114" r="3.3" fill="rgba(165,180,252,0.97)" style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.8))" }} />
                    {/* Bottom left */}
                    <circle cx="38" cy="114" r="7.5" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.85)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 1.2s ease-in-out infinite", transformOrigin: "38px 114px" }} />
                    <circle cx="38" cy="114" r="3.3" fill="rgba(196,181,253,0.95)" style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.8))" }} />
                    {/* Left */}
                    <circle cx="16" cy="52" r="8.5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.88)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 1.6s ease-in-out infinite", transformOrigin: "16px 52px" }} />
                    <circle cx="16" cy="52" r="3.8" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 5px rgba(99,102,241,0.9))" }} />

                    {/* ── Center hub node ── */}
                    <circle cx="74" cy="64" r="14" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.5)" strokeWidth="1" style={{ animation: "pp-outer-ring 2.4s ease-out infinite", transformOrigin: "74px 64px" }} />
                    <circle cx="74" cy="64" r="9" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.75)" strokeWidth="1.5" style={{ animation: "pp-node-pulse 2s 0.2s ease-in-out infinite", transformOrigin: "74px 64px" }} />
                    <circle cx="74" cy="64" r="4" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 7px rgba(99,102,241,1))" }} />
                    {/* Lines from center to nodes */}
                    <line x1="74" y1="64" x2="74" y2="10" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.1s linear infinite" }} />
                    <line x1="74" y1="64" x2="132" y2="52" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.5s linear infinite" }} />
                    <line x1="74" y1="64" x2="110" y2="114" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.9s linear infinite" }} />
                    <line x1="74" y1="64" x2="38" y2="114" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 1.3s linear infinite" }} />
                    <line x1="74" y1="64" x2="16" y2="52" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 1.7s linear infinite" }} />
                  </svg>
                </div>

                {/* Cycling console status */}
                <div
                  key={pulseStatusIndex}
                  style={{
                    fontSize: "clamp(5px, 1vmin, 7px)",
                    fontWeight: 600,
                    color: "rgba(199,210,254,0.95)",
                    fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
                    letterSpacing: "0.03em",
                    animation: "pp-msg-in 0.28s ease both",
                    whiteSpace: "nowrap",
                    background: "rgba(9,10,20,0.65)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    padding: "clamp(1px,0.25vmin,2px) clamp(3px,0.9vmin,5px)",
                    borderRadius: 999,
                    border: "1px solid rgba(99,102,241,0.22)",
                    boxShadow: "0 0 8px rgba(99,102,241,0.18)",
                    maxWidth: "clamp(60px, 18vmin, 110px)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  ▸ {CONSOLE_MESSAGES[pulseStatusIndex]}
                </div>
              </div>
              {/* ═══════════════════════════════════════════════════════════════════ */}

              {DEVICE_CONFIGS[selectedDevice]?.frame === "phone" ? (
                /* flex-1 gives explicit height; relative+overflow-hidden so the abs inner can fill it */
                <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
                  {/* Absolute fill — gives the centering flex container a definite pixel height */}
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0d0f18]" style={{ padding: "28px 24px 16px" }}>
                    {/* Device container: aspect-ratio + height:100% now resolves correctly */}
                    <div
                      style={{
                        aspectRatio: `${parseInt(DEVICE_CONFIGS[selectedDevice].width!)} / ${parseInt(DEVICE_CONFIGS[selectedDevice].height!)}`,
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        position: "relative",
                        flexShrink: 0,
                        transition: "aspect-ratio 0.25s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    >
                      <DeviceFrame deviceKey={selectedDevice}>
                        <iframe
                          ref={iframeRef}
                          src="http://localhost:5000"
                          className="absolute inset-0 w-full h-full border-none"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                          title="Preview"
                          onLoad={handleIframeLoad}
                        />
                        {crashScreen}
                      </DeviceFrame>
                    </div>
                  </div>
                </div>
              ) : DEVICE_CONFIGS[selectedDevice]?.frame === "tablet" ? (
                /* ── TABLET: landscape frame with bezel ── */
                <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background:"radial-gradient(ellipse at 40% 35%, #0d1829 0%, #060c18 45%, #020408 100%)", padding:"32px 40px 28px" }}>
                    <div style={{
                      aspectRatio:"16/9",
                      height:"100%",
                      maxWidth:"100%",
                      maxHeight:"100%",
                      position:"relative",
                      flexShrink:0,
                      transition:"aspect-ratio 0.25s cubic-bezier(0.22,1,0.36,1)",
                    }}>
                      <TabletFrame>
                        <iframe
                          ref={iframeRef}
                          src="http://localhost:5000"
                          className="absolute inset-0 w-full h-full border-none"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                          title="Preview"
                          onLoad={handleIframeLoad}
                        />
                        {crashScreen}
                      </TabletFrame>
                    </div>
                  </div>
                </div>
              ) : selectedDevice === "fullsize" && !customWidth && !customHeight ? (
                /* ── FULLSIZE: fills entire area like a real browser ── */
                <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
                  <iframe
                    ref={iframeRef}
                    src="http://localhost:5000"
                    className="absolute inset-0 w-full h-full border-none bg-white"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    title="Preview"
                    onLoad={handleIframeLoad}
                  />
                  {crashScreen}
                </div>
              ) : (
                /* ── DESKTOP / 16:9 layout ── */
                <div className={`flex-1 flex flex-col items-center justify-center overflow-auto gap-4 ${customWidth ? "bg-[#0d0f18] p-4" : ""}`}>
                  <div
                    ref={previewContainerRef}
                    className="relative flex-shrink-0"
                    style={{
                      overflow: "visible",
                      transition: "width 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s cubic-bezier(0.22,1,0.36,1)",
                      ...(selectedDevice === "16:9"
                        ? { width: "100%", aspectRatio: "16/9", maxHeight: "100%" }
                        : customWidth || customHeight
                        ? { width: customWidth ?? "100%", height: customHeight ?? 500 }
                        : { width: "100%", height: "100%" }),
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src="http://localhost:5000"
                      className="w-full h-full border-none"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                      title="Preview"
                      onLoad={handleIframeLoad}
                    />
                    {crashScreen}

                    {/* Resize handles — desktop/16:9 only */}
                    {selectedDevice === "fullsize" && (
                      <>
                        <div onMouseDown={(e) => handleResizeDragStart(e, "right")} className="absolute top-0 right-0 w-2 h-full cursor-col-resize group z-10 flex items-center justify-center" title="Drag to resize width">
                          <div className="w-1 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(124,141,255,0.7)" }} />
                        </div>
                        <div onMouseDown={(e) => handleResizeDragStart(e, "bottom")} className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize group z-10 flex items-center justify-center" title="Drag to resize height">
                          <div className="h-1 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(124,141,255,0.7)" }} />
                        </div>
                        <div onMouseDown={(e) => handleResizeDragStart(e, "corner")} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 flex items-end justify-end p-0.5" title="Drag to resize">
                          <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }}>
                            <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="rgba(124,141,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Size label for 16:9 / manual resize */}
                  {selectedDevice === "16:9" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.7)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>16:9 · 1280 × 720</span>
                      <button onClick={() => handleSelectDevice("fullsize")} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
                    </div>
                  )}
                  {selectedDevice === "fullsize" && (customWidth || customHeight) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.7)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{Math.round(customWidth ?? 0)} × {Math.round(customHeight ?? 0)}</span>
                      <button onClick={() => { setCustomWidth(null); setCustomHeight(null); }} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
                    </div>
                  )}
                </div>
              )}

              {/* Device label bar (frame devices only) */}
              {DEVICE_CONFIGS[selectedDevice]?.frame === "phone" && (
                <div className="flex items-center justify-center gap-2 py-1.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.6)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {DEVICE_CONFIGS[selectedDevice].label}{DEVICE_CONFIGS[selectedDevice].dims && ` · ${DEVICE_CONFIGS[selectedDevice].dims}`}
                  </span>
                  <button onClick={() => handleSelectDevice("fullsize")} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
                </div>
              )}

              {/* Overlay - Show when not executing (desktop only, not phone/tablet/fullsize) */}
              {!isExecuting && DEVICE_CONFIGS[selectedDevice]?.frame !== "phone" && DEVICE_CONFIGS[selectedDevice]?.frame !== "tablet" && selectedDevice !== "fullsize" && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] bg-opacity-95">
                  <div className="text-center space-y-6">
                    <p className="text-gray-400 text-sm">Ready to preview</p>
                    <Button
                      onClick={handlePlayClick}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold px-8 py-3 text-base"
                      data-testid="button-start-now"
                    >
                      Start Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading overlay - Show when executing (desktop only, not phone/tablet/fullsize) */}
              {isExecuting && DEVICE_CONFIGS[selectedDevice]?.frame !== "phone" && DEVICE_CONFIGS[selectedDevice]?.frame !== "tablet" && selectedDevice !== "fullsize" && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] bg-opacity-90">
                  <div className="text-center space-y-4">
                    <p className="text-gray-300 text-sm font-medium">Running...</p>
                  </div>
                </div>
              )}

              {/* Error Panel - Show when errors exist */}
              {executionState.errors.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-950/95 border-t-2 border-red-600">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-300">
                          Error ({currentErrorIndex + 1} of {executionState.errors.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                          onClick={() => setCurrentErrorIndex(Math.max(0, currentErrorIndex - 1))}
                          disabled={currentErrorIndex === 0}
                          data-testid="button-prev-error"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                          onClick={() => setCurrentErrorIndex(Math.min(executionState.errors.length - 1, currentErrorIndex + 1))}
                          disabled={currentErrorIndex === executionState.errors.length - 1}
                          data-testid="button-next-error"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                          onClick={() => setErrorExpanded(!errorExpanded)}
                          data-testid="button-expand-error"
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${errorExpanded ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Error Details */}
                    <div className="text-xs text-red-200 space-y-1 max-h-24 overflow-y-auto">
                      <p className="font-mono">
                        {executionState.errors[currentErrorIndex]?.message || "Unknown error"}
                      </p>
                      {executionState.errors[currentErrorIndex]?.file && (
                        <p className="text-red-300">
                          {executionState.errors[currentErrorIndex].file}:{executionState.errors[currentErrorIndex].line}:{executionState.errors[currentErrorIndex].column}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Developer Tools Panel - Bottom Overlay */}
              {devToolsOpen && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#050816] border-t border-gray-800 shadow-2xl flex flex-col" style={{height: devToolsMinimized ? "auto" : `${devToolsHeight}px`}}>
                  <div
                    className="h-1.5 cursor-row-resize bg-gray-800/80 hover:bg-gray-700 flex-shrink-0"
                    onMouseDown={handleDevToolsResizeMouseDown}
                  />
                  {/* Dev Tools Header */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-black">
                    <span className="text-xs text-gray-400 ml-3">Network:</span>
                    <select
                      className="bg-[#111827] border border-gray-700 text-xs rounded px-1 py-0.5 text-gray-200"
                      value={networkMode}
                      onChange={(e) => setNetworkMode(e.target.value as any)}
                    >
                      <option value="normal">Normal</option>
                      <option value="slow">Slow 3G</option>
                      <option value="offline">Offline</option>
                    </select>
                    <label className="ml-3 flex items-center gap-1 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={followSharedPreview}
                        onChange={() => setFollowSharedPreview(v => !v)}
                      />
                      Follow team session
                    </label>

                    <Button
                      variant={devToolsTab === "elements" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDevToolsTab("elements")}
                      data-testid="tab-elements"
                    >
                      <Crosshair className="h-3 w-3 mr-1" />
                      Elements
                    </Button>
                    <Button
                      variant={devToolsTab === "console" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDevToolsTab("console")}
                      data-testid="tab-webview-logs"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Webview Logs
                    </Button>
                    <Button
                      variant={devToolsTab === "network" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDevToolsTab("network")}
                      data-testid="tab-server-logs"
                    >
                      <Server className="h-3 w-3 mr-1" />
                      Server Logs
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-gray-200"
                      onClick={() => setDevToolsMinimized(!devToolsMinimized)}
                      data-testid="button-minimize-devtools"
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${devToolsMinimized ? "rotate-180" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-gray-200"
                      onClick={() => setDevToolsOpen(false)}
                      data-testid="button-close-devtools"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {!devToolsMinimized && (
                    <>
                  {/* Elements / Inspect Tab */}
                  {devToolsTab === "elements" && (
                    <div className="flex-1 overflow-y-auto flex flex-col font-mono text-xs">
                      {/* Inspect toolbar */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-black">
                        <span className="text-[11px] text-gray-400 font-sans">
                          {inspectMode ? "Hover and click any element in the preview" : "Enable inspect from the toolbar ⊕"}
                        </span>
                        {selectedElementInfo && (
                          <button
                            onClick={() => setSelectedElementInfo(null)}
                            className="ml-auto text-gray-500 hover:text-gray-300 text-xs font-sans"
                            data-testid="button-clear-inspect"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {!selectedElementInfo ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 p-6">
                          <Crosshair className="h-8 w-8 opacity-30" />
                          <p className="text-center font-sans text-xs">
                            {inspectMode
                              ? "Hover and click any element in the preview"
                              : 'Click "Start Inspect" then click any element in the preview'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-3 space-y-4">
                          {/* Element tag line */}
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Element</p>
                            <div className="bg-black rounded p-2 text-[11px] leading-relaxed" style={{ color: "#a5b4fc" }}>
                              <span style={{ color: "#f87171" }}>&lt;{selectedElementInfo.tag}</span>
                              {selectedElementInfo.id && (
                                <span style={{ color: "#fbbf24" }}> id=&quot;{selectedElementInfo.id}&quot;</span>
                              )}
                              {selectedElementInfo.classes.length > 0 && (
                                <span style={{ color: "#34d399" }}> class=&quot;{selectedElementInfo.classes.join(" ")}&quot;</span>
                              )}
                              {Object.entries(selectedElementInfo.attributes)
                                .filter(([k]) => k !== "id" && k !== "class")
                                .slice(0, 4)
                                .map(([k, v]) => (
                                  <span key={k} style={{ color: "#94a3b8" }}> {k}=&quot;{v.length > 30 ? v.slice(0, 30) + "…" : v}&quot;</span>
                                ))}
                              <span style={{ color: "#f87171" }}>&gt;</span>
                            </div>
                          </div>

                          {/* Box model */}
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Box Model</p>
                            <div className="bg-black rounded p-2 space-y-1 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-gray-500">width</span>
                                <span className="text-blue-300">{selectedElementInfo.rect.width}px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">height</span>
                                <span className="text-blue-300">{selectedElementInfo.rect.height}px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">top</span>
                                <span className="text-gray-300">{selectedElementInfo.rect.top}px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">left</span>
                                <span className="text-gray-300">{selectedElementInfo.rect.left}px</span>
                              </div>
                            </div>
                          </div>

                          {/* Computed Styles */}
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Computed Styles</p>
                            <div className="bg-black rounded p-2 space-y-1 text-[11px]">
                              {Object.entries(selectedElementInfo.styles)
                                .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "")
                                .map(([k, v]) => (
                                  <div key={k} className="flex justify-between gap-2">
                                    <span className="text-[#94a3b8] shrink-0">{k}</span>
                                    <span className="text-[#a5b4fc] text-right break-all">{v.length > 40 ? v.slice(0, 40) + "…" : v}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Webview Logs Tab */}
                  {devToolsTab === "console" && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      {consoleLogs.length > 0 && (
                        <div className="px-3 py-2 border-b border-gray-700 bg-black flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-gray-400 hover:text-gray-200"
                            onClick={() => setConsoleLogs([])}
                            data-testid="button-clear-console"
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
                        {consoleLogs.length === 0 ? (
                          <p className="text-gray-500">No console logs yet...</p>
                        ) : (
                          consoleLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-gray-600 flex-shrink-0">{log.time}</span>
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${
                                log.type === "error" ? "bg-red-900/50 text-red-300" :
                                log.type === "warn" ? "bg-yellow-900/50 text-yellow-300" :
                                log.type === "info" ? "bg-blue-900/50 text-blue-300" :
                                "bg-gray-900/50 text-gray-300"
                              }`}>
                                {log.type.toUpperCase()}
                              </span>
                              <span className={`flex-1 ${
                                log.type === "error"
                                  ? "text-red-300"
                                  : log.type === "warn"
                                  ? "text-yellow-300"
                                  : log.type === "info"
                                  ? "text-blue-300"
                                  : "text-gray-200"
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Server Logs Tab (Network) */}
                  {devToolsTab === "network" && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      {networkRequests.length > 0 && (
                        <div className="px-3 py-2 border-b border-gray-700 bg-black flex justify-end gap-2">
                          <span className="text-xs text-gray-500">{networkRequests.length} requests</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-gray-400 hover:text-gray-200"
                            onClick={() => setNetworkRequests([])}
                            data-testid="button-clear-network"
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto">
                        {networkRequests.length === 0 ? (
                          <div className="p-3 text-gray-500 text-xs">No network requests yet...</div>
                        ) : (
                          <div className="divide-y divide-gray-700">
                            {networkRequests.map((req, idx) => (
                              <div key={idx} className="p-3 text-xs hover:bg-gray-800 transition space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 flex-shrink-0 w-12">{req.time}</span>
                                  <span className={`px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                                    req.method === "GET" ? "bg-blue-900/50 text-blue-300" :
                                    req.method === "POST" ? "bg-green-900/50 text-green-300" :
                                    "bg-gray-900/50 text-gray-300"
                                  }`}>
                                    {req.method}
                                  </span>
                                  <span className="text-gray-300 flex-1 truncate font-mono">{req.url}</span>
                                  <span className={`px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                                    req.status === "200" ? "bg-green-900/50 text-green-300" :
                                    req.status === "error" ? "bg-red-900/50 text-red-300" :
                                    "bg-gray-900/50 text-gray-300"
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                                <div className="text-gray-500 text-xs ml-12 truncate">
                                  {req.type.substring(0, 50)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}
            </main>

          </>
        ) : (
          renderGridModeContent()
        )}
      </div>

      {gridMode && (
        <div className="bg-black border-t border-gray-800">
          <div className="px-4 py-3">
            <div className="grid grid-cols-4 gap-3 mb-8">
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white rounded-xl"
                data-testid="button-tool-secrets"
              >
                <Lock className="h-6 w-6" />
                <span className="font-medium text-sm">Secrets</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white rounded-xl"
                data-testid="button-tool-database"
              >
                <Database className="h-6 w-6" />
                <span className="font-medium text-sm">Database</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white rounded-xl"
                data-testid="button-tool-new-tab"
              >
                <Plus className="h-6 w-6" />
                <span className="font-medium text-sm">New Tab</span>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 py-3 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 text-sm rounded-xl"
                  data-testid="input-search-tools"
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                  data-testid="button-search-icon"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setGridMode(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700 h-11 w-11 rounded-xl flex-shrink-0 border border-gray-700 bg-gray-800/50"
                data-testid="button-close-tools"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <FilesModal isOpen={showFilesModal} onClose={() => setShowFilesModal(false)} />
      <URLSharingModal 
        isOpen={showUrlModal} 
        onClose={() => setShowUrlModal(false)} 
        publicUrl={publicUrl}
        currentPage="preview"
      />
    </div>
  );
}
