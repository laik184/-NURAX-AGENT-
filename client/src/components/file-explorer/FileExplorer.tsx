import { RawTreeNode } from "./types";
import { emojiIcon } from "./file-icon";
import { ContextMenu } from "./ContextMenu";
import { useFileExplorer } from "./use-file-explorer";
import { useState } from "react";

interface FileExplorerProps {
  projectPath: string;
  onSelect?: (path: string) => void;
  activeFile?: string;
}

function RenderNode({
  node, basePath, activeFile, dirtyFiles, aiFiles, hoveredPath,
  setHoveredPath, setFocusedPath, onSelect, onContextMenu,
}: {
  node: RawTreeNode;
  basePath: string;
  activeFile?: string;
  dirtyFiles: Set<string>;
  aiFiles: Set<string>;
  hoveredPath: string | null;
  setHoveredPath: (p: string | null) => void;
  setFocusedPath: (p: string | null) => void;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}) {
  const type  = node.type === "folder" ? "directory" : node.type;
  const full  = (basePath && basePath !== "/" ? basePath + "/" : "") + node.name;
  const isDir = type === "directory";
  const active  = !!activeFile && activeFile === full;
  const dirty   = dirtyFiles.has(full);
  const ai      = aiFiles.has(full);
  const hovered = hoveredPath === full;

  const rowStyle: React.CSSProperties = {
    padding: "2px 6px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6,
    background: active ? "#16355a" : hovered ? "#020617" : "transparent",
    color: "#f9fafb", fontSize: 13,
  };

  const aiBadge = (
    <span style={{ marginLeft: "auto", fontSize: 10, padding: "0 4px",
      borderRadius: 6, background: "#22c55e33", color: "#22c55e" }}>AI</span>
  );

  if (isDir) {
    return (
      <div key={full}>
        <div style={rowStyle}
          onClick={() => { setFocusedPath(full); onSelect(full); }}
          onContextMenu={(e) => onContextMenu(e, full, true)}
          onMouseEnter={() => setHoveredPath(full)}
          onMouseLeave={() => setHoveredPath(null)}
          data-testid={`folder-${node.name}`}>
          <span>{emojiIcon(node.name, type)}</span>
          <span>{node.name}</span>
          {ai && aiBadge}
        </div>
        <div style={{ paddingLeft: 12 }}>
          {Array.isArray(node.children) &&
            node.children.map((child) => (
              <RenderNode key={child.name} node={child} basePath={full}
                activeFile={activeFile} dirtyFiles={dirtyFiles} aiFiles={aiFiles}
                hoveredPath={hoveredPath} setHoveredPath={setHoveredPath}
                setFocusedPath={setFocusedPath} onSelect={onSelect}
                onContextMenu={onContextMenu} />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div key={full} style={rowStyle}
      onClick={() => { setFocusedPath(full); onSelect(full); }}
      onContextMenu={(e) => onContextMenu(e, full, false)}
      onMouseEnter={() => setHoveredPath(full)}
      onMouseLeave={() => setHoveredPath(null)}
      data-testid={`file-${node.name}`}>
      <span>{emojiIcon(node.name, type)}</span>
      <span>{node.name}</span>
      {dirty && <span style={{ marginLeft: "auto" }}>•</span>}
      {ai && !dirty && aiBadge}
    </div>
  );
}

export default function FileExplorer({ projectPath, onSelect, activeFile }: FileExplorerProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);

  const {
    tree, dirtyFiles, aiFiles, hoveredPath, setHoveredPath,
    setFocusedPath, refreshFiles, apiSaveFile,
    handleRenamePath, handleDeletePath,
  } = useFileExplorer({ projectPath, activeFile });

  const openContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewFile = async () => {
    if (!contextMenu) return;
    const base = contextMenu.isDir
      ? contextMenu.path
      : contextMenu.path.replace(/\/[^/]+$/, "");
    const name = window.prompt("New file name:");
    if (!name) return;
    const full = (base.endsWith("/") ? base : base + "/") + name;
    try { await apiSaveFile(full, ""); refreshFiles(full); }
    catch (e) { console.error(e); alert("New file failed."); }
    finally { closeContextMenu(); }
  };

  const handleNewFolder = async () => {
    if (!contextMenu) return;
    const base = contextMenu.isDir
      ? contextMenu.path
      : contextMenu.path.replace(/\/[^/]+$/, "");
    const name = window.prompt("New folder name:");
    if (!name) return;
    const full = (base.endsWith("/") ? base : base + "/") + name + "/.keep";
    try { await apiSaveFile(full, ""); refreshFiles(full); }
    catch (e) { console.error(e); alert("New folder failed."); }
    finally { closeContextMenu(); }
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

  return (
    <div style={{ width: 260, background: "#020617", color: "#e5e7eb",
        borderRight: "1px solid #111827", fontFamily: "system-ui, sans-serif",
        fontSize: 13, position: "relative" }}
      onClick={() => { if (contextMenu) closeContextMenu(); }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #111827",
          fontSize: 12, textTransform: "uppercase", letterSpacing: 0.08, color: "#9ca3af" }}>
        Files
      </div>
      <div style={{ padding: 4, overflowY: "auto", height: "calc(100vh - 32px)" }}>
        {tree.map((node) => (
          <RenderNode key={node.name} node={node} basePath={projectPath || ""}
            activeFile={activeFile} dirtyFiles={dirtyFiles} aiFiles={aiFiles}
            hoveredPath={hoveredPath} setHoveredPath={setHoveredPath}
            setFocusedPath={setFocusedPath}
            onSelect={(path) => onSelect && onSelect(path)}
            onContextMenu={openContextMenu} />
        ))}
      </div>
      <ContextMenu menu={contextMenu}
        onNewFile={handleNewFile} onNewFolder={handleNewFolder}
        onRename={handleRename} onDelete={handleDelete} />
    </div>
  );
}
