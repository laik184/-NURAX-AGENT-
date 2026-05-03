import { useState, useRef, useEffect } from "react";
import {
  ChevronRight, ChevronDown,
  File, Folder, FolderOpen,
  Code2, FileJson, FileType2, Globe, Palette, FileText,
  Settings2, ImageIcon, Search, X, FilePlus, FolderPlus,
  Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── Types ─────────────────────────────── */

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  lang?: string;
};

/* ─────────────────────────── File icon helper ───────────────────── */

function fileIcon(name: string, type: "file" | "folder", open?: boolean): React.ReactElement {
  if (type === "folder")
    return open
      ? <FolderOpen style={{ width: 13, height: 13, flexShrink: 0, color: "#7c8dff" }} />
      : <Folder     style={{ width: 13, height: 13, flexShrink: 0, color: "#7c8dff" }} />;

  const n = name.toLowerCase();
  if (n.endsWith(".tsx") || n.endsWith(".jsx")) return <Code2    style={{ width: 13, height: 13, flexShrink: 0, color: "#60a5fa" }} />;
  if (n.endsWith(".ts")  || n.endsWith(".js"))  return <FileType2 style={{ width: 13, height: 13, flexShrink: 0, color: "#34d399" }} />;
  if (n.endsWith(".json"))  return <FileJson   style={{ width: 13, height: 13, flexShrink: 0, color: "#fbbf24" }} />;
  if (n.endsWith(".css"))   return <Palette    style={{ width: 13, height: 13, flexShrink: 0, color: "#f472b6" }} />;
  if (n.endsWith(".html"))  return <Globe      style={{ width: 13, height: 13, flexShrink: 0, color: "#fb923c" }} />;
  if (n.endsWith(".md"))    return <FileText   style={{ width: 13, height: 13, flexShrink: 0, color: "#94a3b8" }} />;
  if (n.startsWith(".env")) return <Settings2  style={{ width: 13, height: 13, flexShrink: 0, color: "#a3e635" }} />;
  if (n.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) return <ImageIcon style={{ width: 13, height: 13, flexShrink: 0, color: "#c084fc" }} />;
  return <File style={{ width: 13, height: 13, flexShrink: 0, color: "#64748b" }} />;
}

/* ─────────────────────────── Language guesser ───────────────────── */

function guessLang(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".tsx") || n.endsWith(".ts")) return "typescript";
  if (n.endsWith(".jsx") || n.endsWith(".js")) return "javascript";
  if (n.endsWith(".css"))  return "css";
  if (n.endsWith(".html")) return "html";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".md"))   return "markdown";
  return "plaintext";
}

/* ─────────────────────────── Flatten helper ─────────────────────── */

function flattenFiles(nodes: FileNode[], path = ""): { node: FileNode; path: string }[] {
  const result: { node: FileNode; path: string }[] = [];
  for (const n of nodes) {
    const fullPath = path ? `${path}/${n.name}` : n.name;
    if (n.type === "file") {
      result.push({ node: n, path: fullPath });
    }
    if (n.type === "folder" && n.children) {
      result.push(...flattenFiles(n.children, fullPath));
    }
  }
  return result;
}

/* ─────────────────────────── UID helper ─────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ─────────────────────────── Initial tree ───────────────────────── */

function makeInitialTree(): FileNode[] {
  return [
    {
      id: uid(), name: "client", type: "folder",
      children: [
        {
          id: uid(), name: "src", type: "folder",
          children: [
            {
              id: uid(), name: "components", type: "folder",
              children: [
                {
                  id: uid(), name: "Button.tsx", type: "file", lang: "typescript",
                  content: `import { cn } from "@/lib/utils";\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: "default" | "outline" | "ghost";\n  size?: "sm" | "md" | "lg";\n}\n\nexport function Button({ className, variant = "default", size = "md", children, ...props }: ButtonProps) {\n  return (\n    <button\n      className={cn(\n        "inline-flex items-center justify-center rounded-lg font-medium transition-all",\n        variant === "default" && "bg-primary text-white hover:opacity-90",\n        variant === "outline" && "border border-border hover:bg-accent",\n        variant === "ghost" && "hover:bg-accent",\n        size === "sm" && "px-3 py-1.5 text-xs",\n        size === "md" && "px-4 py-2 text-sm",\n        size === "lg" && "px-6 py-3 text-base",\n        className\n      )}\n      {...props}\n    >\n      {children}\n    </button>\n  );\n}`,
                },
                {
                  id: uid(), name: "Card.tsx", type: "file", lang: "typescript",
                  content: `import { cn } from "@/lib/utils";\n\nexport function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {\n  return <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)} {...props}>{children}</div>;\n}\n\nexport function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {\n  return <div className={cn("mb-4", className)} {...props}>{children}</div>;\n}\n\nexport function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {\n  return <h3 className={cn("text-lg font-semibold", className)} {...props}>{children}</h3>;\n}`,
                },
              ],
            },
            {
              id: uid(), name: "pages", type: "folder",
              children: [
                {
                  id: uid(), name: "home.tsx", type: "file", lang: "typescript",
                  content: `import { Button } from "@/components/Button";\nimport { Card } from "@/components/Card";\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">\n      <h1 className="text-4xl font-bold tracking-tight">Welcome to Nura X</h1>\n      <p className="text-lg text-muted-foreground max-w-md text-center">\n        Your AI-powered workspace. Start building something amazing.\n      </p>\n      <div className="flex gap-3">\n        <Button>Get started</Button>\n        <Button variant="outline">Learn more</Button>\n      </div>\n    </div>\n  );\n}`,
                },
                {
                  id: uid(), name: "dashboard.tsx", type: "file", lang: "typescript",
                  content: `import { useState } from "react";\n\nexport default function Dashboard() {\n  return (\n    <div className="p-6">\n      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>\n    </div>\n  );\n}`,
                },
              ],
            },
            {
              id: uid(), name: "lib", type: "folder",
              children: [
                {
                  id: uid(), name: "utils.ts", type: "file", lang: "typescript",
                  content: `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}`,
                },
              ],
            },
            { id: uid(), name: "main.tsx",   type: "file", lang: "typescript", content: `import ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);` },
            { id: uid(), name: "index.css",  type: "file", lang: "css",        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n` },
            { id: uid(), name: "App.tsx",    type: "file", lang: "typescript", content: `import { Switch, Route } from "wouter";\nimport Home from "@/pages/home";\n\nfunction App() {\n  return (\n    <Switch>\n      <Route path="/" component={Home} />\n    </Switch>\n  );\n}\n\nexport default App;` },
          ],
        },
        { id: uid(), name: "index.html", type: "file", lang: "html", content: `<!DOCTYPE html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Nura X App</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>` },
      ],
    },
    {
      id: uid(), name: "shared", type: "folder",
      children: [
        { id: uid(), name: "schema.ts", type: "file", lang: "typescript", content: `// Shared schema\nexport type User = { id: number; name: string; email: string; };` },
      ],
    },
    { id: uid(), name: "package.json",       type: "file", lang: "json",        content: `{\n  "name": "nura-x-app",\n  "version": "1.0.0"\n}` },
    { id: uid(), name: "tsconfig.json",      type: "file", lang: "json",        content: `{\n  "compilerOptions": { "strict": true, "jsx": "react-jsx" }\n}` },
    { id: uid(), name: "vite.config.ts",     type: "file", lang: "typescript",  content: `import { defineConfig } from "vite";\nexport default defineConfig({ server: { host: "0.0.0.0", port: 5000 } });` },
    { id: uid(), name: "tailwind.config.ts", type: "file", lang: "typescript",  content: `export default { content: ["./client/src/**/*.{ts,tsx}"] };` },
    { id: uid(), name: ".env",               type: "file", lang: "plaintext",   content: `DATABASE_URL=postgresql://localhost:5432/myapp\nNODE_ENV=development` },
  ];
}

/* ─────────────────────────── Inline rename input ────────────────── */

function InlineInput({
  initialValue = "",
  onConfirm,
  onCancel,
}: {
  initialValue?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter")  { e.preventDefault(); if (val.trim()) onConfirm(val.trim()); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onBlur={() => { if (val.trim()) onConfirm(val.trim()); else onCancel(); }}
      className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-[11.5px] outline-none"
      style={{
        background: "rgba(124,141,255,0.12)",
        border: "1px solid rgba(124,141,255,0.35)",
        color: "rgba(226,232,240,0.95)",
      }}
      autoFocus
      data-testid="input-file-rename"
    />
  );
}

/* ─────────────────────────── TreeNode ───────────────────────────── */

function TreeNode({
  node,
  depth,
  activeFileName,
  onSelect,
  onDelete,
  onRename,
}: {
  node: FileNode;
  depth: number;
  activeFileName: string;
  onSelect: (node: FileNode) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const [open, setOpen]           = useState(depth < 2);
  const [renaming, setRenaming]   = useState(false);
  const [hovered, setHovered]     = useState(false);

  if (node.type === "folder") {
    return (
      <div>
        <div
          className="flex items-center w-full gap-1 rounded-md text-left transition-colors cursor-pointer"
          style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 6 + depth * 12, paddingRight: 6 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setOpen((v) => !v)}
          data-testid={`folder-${node.name}`}
        >
          <span style={{ color: "rgba(148,163,184,0.35)", flexShrink: 0 }}>
            {open ? <ChevronDown style={{ width: 11, height: 11 }} /> : <ChevronRight style={{ width: 11, height: 11 }} />}
          </span>
          {fileIcon(node.name, "folder", open)}
          {renaming ? (
            <InlineInput
              initialValue={node.name}
              onConfirm={(n) => { onRename(node.id, n); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="text-[12px] text-foreground/75 truncate flex-1" style={{ lineHeight: "1.4" }}>
              {node.name}
            </span>
          )}
          {hovered && !renaming && (
            <div className="flex items-center gap-0.5 ml-auto pl-1 flex-shrink-0">
              <ActionIcon onClick={(e) => { e.stopPropagation(); setRenaming(true); }} title="Rename" testId={`rename-${node.name}`}>
                <Pencil style={{ width: 9, height: 9 }} />
              </ActionIcon>
              <ActionIcon onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} title="Delete" danger testId={`delete-${node.name}`}>
                <Trash2 style={{ width: 9, height: 9 }} />
              </ActionIcon>
            </div>
          )}
        </div>
        {open && node.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            activeFileName={activeFileName}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    );
  }

  const isActive = activeFileName === node.name;
  return (
    <div
      className={cn(
        "flex items-center w-full gap-1 rounded-md text-left transition-all cursor-pointer",
        isActive ? "text-foreground" : "text-foreground/60 hover:text-foreground/90"
      )}
      style={{
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: 6 + depth * 12,
        paddingRight: 6,
        background: isActive ? "rgba(124,141,255,0.12)" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !renaming && onSelect(node)}
      data-testid={`file-${node.name}`}
    >
      {fileIcon(node.name, "file")}
      {renaming ? (
        <InlineInput
          initialValue={node.name}
          onConfirm={(n) => { onRename(node.id, n); setRenaming(false); }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span className="text-[12px] truncate flex-1" style={{ lineHeight: "1.4" }}>{node.name}</span>
      )}
      {hovered && !renaming && (
        <div className="flex items-center gap-0.5 ml-auto pl-1 flex-shrink-0">
          <ActionIcon onClick={(e) => { e.stopPropagation(); setRenaming(true); }} title="Rename" testId={`rename-${node.name}`}>
            <Pencil style={{ width: 9, height: 9 }} />
          </ActionIcon>
          <ActionIcon onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} title="Delete" danger testId={`delete-${node.name}`}>
            <Trash2 style={{ width: 9, height: 9 }} />
          </ActionIcon>
        </div>
      )}
    </div>
  );
}

function ActionIcon({
  children, onClick, title, danger = false, testId,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-testid={testId}
      className="w-4 h-4 flex items-center justify-center rounded transition-colors"
      style={{ color: danger ? "rgba(248,113,113,0.6)" : "rgba(148,163,184,0.5)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "rgba(239,68,68,0.12)"
          : "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.color = danger ? "#f87171" : "rgba(226,232,240,0.8)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = danger
          ? "rgba(248,113,113,0.6)"
          : "rgba(148,163,184,0.5)";
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── Tree mutation helpers ─────────────── */

function deleteNodeById(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? deleteNodeById(n.children, id) : undefined,
    }));
}

function renameNodeById(nodes: FileNode[], id: string, newName: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name: newName, lang: n.type === "file" ? guessLang(newName) : n.lang };
    return { ...n, children: n.children ? renameNodeById(n.children, id, newName) : undefined };
  });
}

function addNodeToRoot(nodes: FileNode[], node: FileNode): FileNode[] {
  return [node, ...nodes];
}

/* ─────────────────────────── FileTreePanel ─────────────────────── */

export function FileTreePanel({
  onFileOpen,
  onClose,
  activeFileName = "",
}: {
  onFileOpen: (name: string, content: string, lang: string) => void;
  onClose: () => void;
  activeFileName?: string;
}) {
  const [tree, setTree]             = useState<FileNode[]>(makeInitialTree);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const sq = searchQuery.trim().toLowerCase();

  /* Search results */
  const searchResults = sq ? flattenFiles(tree).filter(({ path }) => path.toLowerCase().includes(sq)) : [];

  /* Handlers */
  const handleSelect = (node: FileNode) => {
    if (node.type === "file") {
      onFileOpen(node.name, node.content ?? "", node.lang ?? guessLang(node.name));
    }
  };

  const handleDelete = (id: string) => {
    setTree((prev) => deleteNodeById(prev, id));
  };

  const handleRename = (id: string, newName: string) => {
    setTree((prev) => renameNodeById(prev, id, newName));
  };

  const handleNewFile = (name: string) => {
    const node: FileNode = { id: uid(), name, type: "file", lang: guessLang(name), content: "" };
    setTree((prev) => addNodeToRoot(prev, node));
    setCreatingFile(false);
    onFileOpen(name, "", guessLang(name));
  };

  const handleNewFolder = (name: string) => {
    const node: FileNode = { id: uid(), name, type: "folder", children: [] };
    setTree((prev) => addNodeToRoot(prev, node));
    setCreatingFolder(false);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "rgba(10,12,22,0.97)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.4)" }}>
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <ActionIcon onClick={() => setCreatingFile(true)} title="New File" testId="button-new-file">
            <FilePlus style={{ width: 12, height: 12 }} />
          </ActionIcon>
          <ActionIcon onClick={() => setCreatingFolder(true)} title="New Folder" testId="button-new-folder">
            <FolderPlus style={{ width: 12, height: 12 }} />
          </ActionIcon>
          <ActionIcon onClick={onClose} title="Close Explorer" testId="button-close-file-explorer">
            <X style={{ width: 12, height: 12 }} />
          </ActionIcon>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div
        className="px-2 py-1.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search style={{ width: 11, height: 11, color: "rgba(148,163,184,0.4)", flexShrink: 0 }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            className="flex-1 bg-transparent outline-none text-[11.5px]"
            style={{ color: "rgba(226,232,240,0.8)", caretColor: "rgba(124,141,255,0.9)" }}
            data-testid="input-file-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="flex-shrink-0"
              style={{ color: "rgba(148,163,184,0.4)" }}
            >
              <X style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Inline create inputs ── */}
      {(creatingFile || creatingFolder) && (
        <div
          className="px-3 py-1.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            {creatingFile
              ? <FilePlus   style={{ width: 12, height: 12, color: "#60a5fa", flexShrink: 0 }} />
              : <FolderPlus style={{ width: 12, height: 12, color: "#7c8dff", flexShrink: 0 }} />
            }
            <InlineInput
              initialValue={creatingFile ? "newfile.tsx" : "new-folder"}
              onConfirm={creatingFile ? handleNewFile : handleNewFolder}
              onCancel={() => { setCreatingFile(false); setCreatingFolder(false); }}
            />
          </div>
        </div>
      )}

      {/* ── Tree / Search results ── */}
      <div
        className="flex-1 overflow-y-auto py-1 px-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
      >
        {sq ? (
          /* Search results (flat list) */
          searchResults.length > 0 ? (
            searchResults.map(({ node, path }) => (
              <button
                key={node.id}
                onClick={() => handleSelect(node)}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                style={{ background: activeFileName === node.name ? "rgba(124,141,255,0.12)" : undefined }}
                data-testid={`search-result-${node.name}`}
              >
                {fileIcon(node.name, "file")}
                <div className="min-w-0">
                  <p className="text-[11.5px] truncate" style={{ color: activeFileName === node.name ? "rgba(226,232,240,0.95)" : "rgba(203,213,225,0.75)" }}>
                    {node.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(100,116,139,0.55)" }}>
                    {path.split("/").slice(0, -1).join("/")}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Search style={{ width: 20, height: 20, color: "rgba(148,163,184,0.15)" }} />
              <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.35)" }}>
                No files match "{searchQuery}"
              </p>
            </div>
          )
        ) : (
          /* Normal tree */
          tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              activeFileName={activeFileName}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))
        )}
      </div>

      {/* ── Footer: file count ── */}
      <div
        className="flex-shrink-0 px-3 py-1.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[10px]" style={{ color: "rgba(100,116,139,0.4)" }}>
          {flattenFiles(tree).length} files
        </span>
      </div>
    </div>
  );
}
