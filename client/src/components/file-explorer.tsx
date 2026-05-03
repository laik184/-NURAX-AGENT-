import React, { useEffect, useState } from "react";

// Replit-style File Explorer with:
// - Right-click menu
// - Unsaved dot
// - Active highlight
// - File icons
// - AI badge
// - Agent + Console SSE sync
// - Keyboard shortcuts (Delete, F2, Ctrl+S)
export default function FileExplorer({ projectPath, onSelect, activeFile }) {
  const [localStatus, setLocalStatus] = useState<{dirty?:boolean,conflict?:boolean,aiPending?:boolean,timeline?:boolean,synced?:boolean}>({});
  useEffect(()=>{
    // subscribe to status updates for each rendered file
    const unsubAll = [];
    // we will rely on getStatus(file.path) while rendering
    return ()=>{ unsubAll.forEach(u=>u && u()); };
  }, []);

  const [tree, setTree] = useState([]);
  const [dirtyFiles, setDirtyFiles] = useState(new Set());
  const [aiFiles, setAiFiles] = useState(new Set());
  const [contextMenu, setContextMenu] = useState<{x:number,y:number,path:string,isDir:boolean}|null>(null);
  const [focusedPath, setFocusedPath] = useState<string|null>(null);
  const [hoveredPath, setHoveredPath] = useState<string|null>(null);

  const loadTree = () => {
  if (!projectPath) return;
  const currentProject = projectPath;

  fetch(`/api/list-files?projectPath=${encodeURIComponent(currentProject)}`)
    .then((r) => r.json())
    .then((j) => {
      if (currentProject !== projectPath) return; // stale response guard
      if (j.ok && Array.isArray(j.tree)) {
        setTree(j.tree);
      }
    })
    .catch((err) => {
      console.error("[Explorer] Failed to load tree:", err);
    });
};

  const refreshFiles = (optimisticPath?: string) => {
  if (optimisticPath && tree) {
    setTree(prev => optimisticInsertFile(prev, optimisticPath));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("file-refresh"));
  }
};

  const iconFor = (name, type) => {
    if (type === "directory" || type === "folder") return "📁";
    if (name.endsWith(".tsx") || name.endsWith(".jsx")) return "🧩";
    if (name.endsWith(".ts") || name.endsWith(".js")) return "📜";
    if (name.endsWith(".json")) return "📄";
    if (name.endsWith(".html")) return "🌐";
    if (name.endsWith(".css")) return "🎨";
    return "📃";
  };

  const isDirty = (full) => dirtyFiles.has(full);
  const isAI = (full) => aiFiles.has(full);
  const isActive = (full) => !!activeFile && activeFile === full;

  const optimisticInsertFile = (tree, filePath) => {
    const parts = filePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    const newTree = JSON.parse(JSON.stringify(tree || []));
    let cursor = newTree;
    for (const part of parts) {
      let folder = cursor.find(n => n.type === "folder" && n.name === part);
      if (!folder) {
        folder = { type: "folder", name: part, children: [] };
        cursor.push(folder);
      }
      cursor = folder.children;
    }
    if (!cursor.find(n => n.type === "file" && n.name === fileName)) {
      cursor.push({ type: "file", name: fileName, optimistic: true });
    }
    return newTree;
  };

  const removeOptimisticFile = (tree, filePath) => {
    const parts = filePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    const newTree = JSON.parse(JSON.stringify(tree || []));
    let cursor = newTree;
    for (const part of parts) {
      const folder = cursor.find(n => n.type === "folder" && n.name === part);
      if (!folder) return newTree;
      cursor = folder.children;
    }
    const idx = cursor.findIndex(n => n.type === "file" && n.name === fileName && n.optimistic);
    if (idx !== -1) cursor.splice(idx, 1);
    return newTree;
  };

  useEffect(() => {
    loadTree();
  }, [projectPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      loadTree();
    };
    const onCreateFailed = (e) => {
      try {
        const path = e?.detail?.path;
        if (path) {
          setTree(prev => removeOptimisticFile(prev, path));
          console.warn("[Explorer] Rolled back optimistic file:", path);
        }
      } catch {}
    };
    window.addEventListener("file-refresh", handler);
    window.addEventListener("file-create-failed", onCreateFailed);
    window.addEventListener("explorer:refresh", handler);
    return () => {
      window.removeEventListener("file-refresh", handler);
      window.removeEventListener("file-create-failed", onCreateFailed);
      window.removeEventListener("explorer:refresh", handler);
    };
  }, [projectPath]);
  // editor dirty/saved events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onDirty = (e) => {
      const path = e.detail && e.detail.path;
      if (!path) return;
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    };

    const onSaved = (e) => {
      const path = e.detail && e.detail.path;
      if (!path) return;
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    };

    window.addEventListener("file-dirty", onDirty);
    window.addEventListener("file-saved", onSaved);
    return () => {
      window.removeEventListener("file-dirty", onDirty);
      window.removeEventListener("file-saved", onSaved);
    };
  }, []);

  // agent SSE: mark AI-modified files + refresh
  useEffect(() => {
    const es = new EventSource("/sse/agent");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "diff" && data.diff && data.diff.path) {
          const fullPath = data.diff.path;
          setAiFiles((prev) => {
            const next = new Set(prev);
            next.add(fullPath);
            return next;
          });
          if (!data.projectId || data.projectId === projectPath) refreshFiles();
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  // console SSE: if logs mention files, refresh tree
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

  // file-system SSE: real-time watcher
  useEffect(() => {
    if (typeof window === "undefined") return;

    const es = new EventSource(`/sse/files?projectId=${encodeURIComponent(projectPath)}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // For now, refresh the whole tree on any change event.
        if (!data.projectId || data.projectId === projectPath) refreshFiles();
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, [projectPath]);

  // keyboard shortcuts: Delete, F2, Ctrl+S
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e) => {
      const target = focusedPath || activeFile;
      if (!target) return;

      if (e.key === "Delete") {
        e.preventDefault();
        handleDeletePath(target);
      }
      if (e.key === "F2") {
        e.preventDefault();
        handleRenamePath(target);
      }
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        try {
          window.dispatchEvent(
            new CustomEvent("global-save", { detail: { from: "file-explorer" } })
          );
        } catch {
          window.dispatchEvent(new Event("global-save"));
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedPath, activeFile]);

  const openContextMenu = (event, full, isDir) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      path: full,
      isDir,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const apiRenameFile = async (oldPath, newPath) => {
    const res = await fetch("/api/rename-file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert("Rename failed: " + text);
    }
  };

  const apiDeleteFile = async (targetPath) => {
    const res = await fetch("/api/delete-file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetPath }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert("Delete failed: " + text);
    }
  };

  const apiSaveFile = async (filePath, content) => {
    await fetch("/api/save-file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filePath, content }),
    });
  };

  const handleNewFile = async () => {
    if (!contextMenu) return;
    const basePath = contextMenu.isDir
      ? contextMenu.path
      : contextMenu.path.replace(/\/[^/]+$/, "");
    const name = window.prompt("New file name:");
    if (!name) return;
    const full = (basePath.endsWith("/") ? basePath : basePath + "/") + name;
    try {
      await apiSaveFile(full, "");
      refreshFiles(full);
    } catch (e) {
      console.error(e);
      alert("New file failed.");
    } finally {
      closeContextMenu();
    }
  };

  const handleNewFolder = async () => {
    if (!contextMenu) return;
    const basePath = contextMenu.isDir
      ? contextMenu.path
      : contextMenu.path.replace(/\/[^/]+$/, "");
    const name = window.prompt("New folder name:");
    if (!name) return;
    const full =
      (basePath.endsWith("/") ? basePath : basePath + "/") + name + "/.keep";
    try {
      await apiSaveFile(full, "");
      refreshFiles(full);
    } catch (e) {
      console.error(e);
      alert("New folder failed.");
    } finally {
      closeContextMenu();
    }
  };

  const handleRenamePath = async (path) => {
    if (!path) return;
    const segments = path.split("/");
    const oldName = segments.pop();
    const baseDir = segments.join("/");
    const newName = window.prompt("Rename to:", oldName);
    if (!newName || newName === oldName) return;
    const newPath = (baseDir ? baseDir + "/" : "") + newName;
    try {
      await apiRenameFile(path, newPath);
      refreshFiles(newPath);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePath = async (path) => {
    if (!path) return;
    if (!window.confirm("Delete this file/folder?")) return;
    try {
      await apiDeleteFile(path);
      refreshFiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRename = async () => {
    if (!contextMenu) return;
    await handleRenamePath(contextMenu.path);
    closeContextMenu();
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    await handleDeletePath(contextMenu.path);
    closeContextMenu();
  };

  const renderNode = (node, basePath = "") => {
    const type = node.type === "folder" ? "directory" : node.type;
    const full =
      (basePath && basePath !== "/" ? basePath + "/" : "") + node.name;
    const isDir = type === "directory";
    const label = node.name || "(root)";
    const active = isActive(full);
    const dirty = isDirty(full);
    const ai = isAI(full);
    const hovered = hoveredPath === full;

    const rowStyle = {
      padding: "2px 6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: active ? "#16355a" : hovered ? "#020617" : "transparent",
      color: "#f9fafb",
      fontSize: 13,
    };

    const onClick = () => {
      setFocusedPath(full);
      onSelect && onSelect(full);
    };

    if (isDir) {
      return (
        <div key={full}>
          <div
            style={rowStyle}
            onClick={onClick}
            onContextMenu={(e) => openContextMenu(e, full, true)}
            onMouseEnter={() => setHoveredPath(full)}
            onMouseLeave={() => setHoveredPath(null)}
          >
            <span>{iconFor(label, type)}</span>
            <span>{label}</span>
            {ai && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  padding: "0 4px",
                  borderRadius: 6,
                  background: "#22c55e33",
                  color: "#22c55e",
                }}
              >
                AI
              </span>
            )}
          </div>
          <div style={{ paddingLeft: 12 }}>
            {Array.isArray(node.children) &&
              node.children.map((child) => renderNode(child, full))}
          </div>
        </div>
      );
    }

    return (
      <div
        key={full}
        style={rowStyle}
        onClick={onClick}
        onContextMenu={(e) => openContextMenu(e, full, false)}
        onMouseEnter={() => setHoveredPath(full)}
        onMouseLeave={() => setHoveredPath(null)}
      >
        <span>{iconFor(label, type)}</span>
        <span>{label}</span>
        {dirty && <span style={{ marginLeft: "auto" }}>•</span>}
        {ai && !dirty && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              padding: "0 4px",
              borderRadius: 6,
              background: "#22c55e33",
              color: "#22c55e",
            }}
          >
            AI
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 260,
        background: "#020617",
        color: "#e5e7eb",
        borderRight: "1px solid #111827",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        position: "relative",
      }}
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid #111827",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.08,
          color: "#9ca3af",
        }}
      >
        Files
      </div>
      <div style={{ padding: 4, overflowY: "auto", height: "calc(100vh - 32px)" }}>
        {tree.map((node) => renderNode(node, projectPath || ""))}
      </div>

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#020617",
            border: "1px solid #1f2937",
            borderRadius: 6,
            padding: 4,
            zIndex: 9999,
            minWidth: 140,
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{ padding: "4px 8px", cursor: "pointer" }}
            onClick={handleNewFile}
          >
            New File
          </div>
          <div
            style={{ padding: "4px 8px", cursor: "pointer" }}
            onClick={handleNewFolder}
          >
            New Folder
          </div>
          <div
            style={{ padding: "4px 8px", cursor: "pointer" }}
            onClick={handleRename}
          >
            Rename
          </div>
          <div
            style={{ padding: "4px 8px", cursor: "pointer", color: "#f97373" }}
            onClick={handleDelete}
          >
            Delete
          </div>
        </div>
      )}
    </div>
  );
}