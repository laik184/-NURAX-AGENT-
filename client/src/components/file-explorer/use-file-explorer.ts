import { useState, useEffect } from "react";
import { RawTreeNode } from "./types";
import { optimisticInsertFile, removeOptimisticFile } from "./tree-helpers";

interface UseFileExplorerOptions {
  projectPath: string;
  activeFile?: string;
}

export function useFileExplorer({ projectPath, activeFile }: UseFileExplorerOptions) {
  const [tree, setTree]             = useState<RawTreeNode[]>([]);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [aiFiles, setAiFiles]       = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const loadTree = () => {
    if (!projectPath) return;
    const current = projectPath;
    fetch(`/api/list-files?projectPath=${encodeURIComponent(current)}`)
      .then((r) => r.json())
      .then((j) => {
        if (current !== projectPath) return;
        if (j.ok && Array.isArray(j.tree)) setTree(j.tree);
      })
      .catch((err) => console.error("[Explorer] Failed to load tree:", err));
  };

  const refreshFiles = (optimisticPath?: string) => {
    if (optimisticPath) setTree((prev) => optimisticInsertFile(prev, optimisticPath));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("file-refresh"));
  };

  useEffect(() => { loadTree(); }, [projectPath]);

  useEffect(() => {
    const onRefresh = () => loadTree();
    const onCreateFailed = (e: Event) => {
      try {
        const path = (e as CustomEvent)?.detail?.path;
        if (path) setTree((prev) => removeOptimisticFile(prev, path));
      } catch {}
    };
    window.addEventListener("file-refresh", onRefresh);
    window.addEventListener("file-create-failed", onCreateFailed);
    window.addEventListener("explorer:refresh", onRefresh);
    return () => {
      window.removeEventListener("file-refresh", onRefresh);
      window.removeEventListener("file-create-failed", onCreateFailed);
      window.removeEventListener("explorer:refresh", onRefresh);
    };
  }, [projectPath]);

  useEffect(() => {
    const onDirty = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (!path) return;
      setDirtyFiles((prev) => new Set(prev).add(path));
    };
    const onSaved = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (!path) return;
      setDirtyFiles((prev) => { const n = new Set(prev); n.delete(path); return n; });
    };
    window.addEventListener("file-dirty", onDirty);
    window.addEventListener("file-saved", onSaved);
    return () => {
      window.removeEventListener("file-dirty", onDirty);
      window.removeEventListener("file-saved", onSaved);
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/sse/agent");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "diff" && data.diff?.path) {
          setAiFiles((prev) => new Set(prev).add(data.diff.path));
          if (!data.projectId || data.projectId === projectPath) refreshFiles();
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const es = new EventSource("/sse/console");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.file || (data.msg && data.msg.includes("file"))) {
          if (!data.projectId || data.projectId === projectPath) refreshFiles();
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!projectPath) return;
    const es = new EventSource(`/sse/files?projectId=${encodeURIComponent(projectPath)}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.projectId || data.projectId === projectPath) refreshFiles();
      } catch {}
    };
    es.onerror = () => { try { es.close(); } catch {} };
    return () => { try { es.close(); } catch {} };
  }, [projectPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = focusedPath || activeFile;
      if (!target) return;
      if (e.key === "Delete") { e.preventDefault(); handleDeletePath(target); }
      if (e.key === "F2")     { e.preventDefault(); handleRenamePath(target); }
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        try { window.dispatchEvent(new CustomEvent("global-save", { detail: { from: "file-explorer" } })); }
        catch { window.dispatchEvent(new Event("global-save")); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedPath, activeFile]);

  const apiRenameFile = async (oldPath: string, newPath: string) => {
    const res = await fetch("/api/rename-file", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) alert("Rename failed: " + await res.text());
  };

  const apiDeleteFile = async (targetPath: string) => {
    const res = await fetch("/api/delete-file", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetPath }),
    });
    if (!res.ok) alert("Delete failed: " + await res.text());
  };

  const apiSaveFile = async (filePath: string, content: string) => {
    await fetch("/api/save-file", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ filePath, content }),
    });
  };

  const handleRenamePath = async (path: string) => {
    const segments = path.split("/");
    const oldName = segments.pop()!;
    const baseDir = segments.join("/");
    const newName = window.prompt("Rename to:", oldName);
    if (!newName || newName === oldName) return;
    const newPath = (baseDir ? baseDir + "/" : "") + newName;
    try { await apiRenameFile(path, newPath); refreshFiles(newPath); }
    catch (e) { console.error(e); }
  };

  const handleDeletePath = async (path: string) => {
    if (!window.confirm("Delete this file/folder?")) return;
    try { await apiDeleteFile(path); refreshFiles(); }
    catch (e) { console.error(e); }
  };

  return {
    tree, dirtyFiles, aiFiles, focusedPath, hoveredPath,
    setFocusedPath, setHoveredPath,
    refreshFiles, apiSaveFile,
    handleRenamePath, handleDeletePath,
  };
}
