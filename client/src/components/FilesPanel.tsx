import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Code2,
  FileJson,
  FileType,
  Globe,
  Palette,
  FileText,
  Settings,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FileNode = {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  lang?: string;
};

const MOCK_TREE: FileNode[] = [
  {
    name: "client",
    type: "folder",
    children: [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "components",
            type: "folder",
            children: [
              { name: "App.tsx", type: "file", lang: "typescript", content: `import { Switch, Route } from "wouter";\nimport Home from "@/pages/home";\n\nfunction App() {\n  return (\n    <Switch>\n      <Route path="/" component={Home} />\n    </Switch>\n  );\n}\n\nexport default App;` },
              { name: "Button.tsx", type: "file", lang: "typescript", content: `import { cn } from "@/lib/utils";\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: "default" | "outline" | "ghost";\n}\n\nexport function Button({ className, variant = "default", ...props }: ButtonProps) {\n  return (\n    <button\n      className={cn("px-4 py-2 rounded-lg font-medium transition-all", className)}\n      {...props}\n    />\n  );\n}` },
            ],
          },
          {
            name: "pages",
            type: "folder",
            children: [
              { name: "home.tsx", type: "file", lang: "typescript", content: `export default function Home() {\n  return (\n    <div className="flex flex-col items-center justify-center min-h-screen">\n      <h1 className="text-4xl font-bold">Welcome</h1>\n      <p className="text-muted-foreground mt-2">Start building something amazing.</p>\n    </div>\n  );\n}` },
            ],
          },
          {
            name: "lib",
            type: "folder",
            children: [
              { name: "utils.ts", type: "file", lang: "typescript", content: `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}` },
              { name: "queryClient.ts", type: "file", lang: "typescript", content: `import { QueryClient } from "@tanstack/react-query";\n\nexport const queryClient = new QueryClient({\n  defaultOptions: {\n    queries: { staleTime: 60 * 1000 },\n  },\n});` },
            ],
          },
          { name: "main.tsx", type: "file", lang: "typescript", content: `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);` },
          { name: "index.css", type: "file", lang: "css", content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 222 30% 7%;\n  --foreground: 213 31% 91%;\n  --primary: 234 100% 75%;\n}` },
        ],
      },
      { name: "index.html", type: "file", lang: "html", content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>` },
    ],
  },
  {
    name: "shared",
    type: "folder",
    children: [
      { name: "schema.ts", type: "file", lang: "typescript", content: `import { pgTable, text, serial } from "drizzle-orm/pg-core";\nimport { createInsertSchema } from "drizzle-zod";\nimport { z } from "zod";\n\nexport const users = pgTable("users", {\n  id: serial("id").primaryKey(),\n  name: text("name").notNull(),\n  email: text("email").notNull().unique(),\n});\n\nexport const insertUserSchema = createInsertSchema(users);\nexport type InsertUser = z.infer<typeof insertUserSchema>;\nexport type User = typeof users.$inferSelect;` },
    ],
  },
  { name: "package.json", type: "file", lang: "json", content: `{\n  "name": "my-app",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite --host 0.0.0.0 --port 5000",\n    "build": "tsc && vite build"\n  }\n}` },
  { name: "tsconfig.json", type: "file", lang: "json", content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "lib": ["ES2020", "DOM"],\n    "module": "ESNext",\n    "strict": true,\n    "jsx": "react-jsx"\n  }\n}` },
  { name: "vite.config.ts", type: "file", lang: "typescript", content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport path from "path";\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: { "@": path.resolve(__dirname, "client/src") },\n  },\n  server: { host: "0.0.0.0", port: 5000 },\n});` },
  { name: "tailwind.config.ts", type: "file", lang: "typescript", content: `import type { Config } from "tailwindcss";\n\nexport default {\n  content: ["./client/src/**/*.{ts,tsx}"],\n  darkMode: ["class"],\n  theme: { extend: {} },\n  plugins: [],\n} satisfies Config;` },
  { name: ".env", type: "file", lang: "plaintext", content: `DATABASE_URL=postgresql://localhost:5432/myapp\nSESSION_SECRET=your-secret-here` },
];

function fileIcon(name: string, type: "file" | "folder", open?: boolean) {
  if (type === "folder") {
    return open
      ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7c8dff" }} />
      : <Folder className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7c8dff" }} />;
  }
  if (name.endsWith(".tsx") || name.endsWith(".jsx"))
    return <Code2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />;
  if (name.endsWith(".ts") || name.endsWith(".js"))
    return <FileType className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#34d399" }} />;
  if (name.endsWith(".json"))
    return <FileJson className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />;
  if (name.endsWith(".css"))
    return <Palette className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#f472b6" }} />;
  if (name.endsWith(".html"))
    return <Globe className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#fb923c" }} />;
  if (name.endsWith(".env") || name.endsWith(".env.local"))
    return <Settings className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#a3e635" }} />;
  if (name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/))
    return <Image className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#c084fc" }} />;
  if (name.endsWith(".md"))
    return <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#94a3b8" }} />;
  return <File className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#64748b" }} />;
}

function TreeNode({
  node,
  depth,
  activeFile,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  activeFile: FileNode | null;
  onSelect: (node: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isActive = activeFile?.name === node.name && node.type === "file";

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="flex items-center w-full gap-1.5 px-2 py-[3px] rounded-md text-left transition-colors hover:bg-white/5 group"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setOpen((v) => !v)}
          data-testid={`folder-${node.name}`}
        >
          <span className="flex-shrink-0 text-muted-foreground/40">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          {fileIcon(node.name, "folder", open)}
          <span className="text-[12px] text-foreground/80 group-hover:text-foreground transition-colors truncate">
            {node.name}
          </span>
        </button>
        {open && node.children?.map((child) => (
          <TreeNode
            key={child.name}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex items-center w-full gap-1.5 px-2 py-[3px] rounded-md text-left transition-all",
        isActive
          ? "bg-primary/15 text-foreground"
          : "text-foreground/65 hover:text-foreground/90 hover:bg-white/5"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onClick={() => onSelect(node)}
      data-testid={`file-${node.name}`}
    >
      {fileIcon(node.name, "file")}
      <span className="text-[12px] truncate">{node.name}</span>
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "#7c8dff" }}
        />
      )}
    </button>
  );
}

function langFor(node: FileNode | null): string {
  if (!node) return "typescript";
  if (node.lang) return node.lang;
  const n = node.name;
  if (n.endsWith(".tsx") || n.endsWith(".ts")) return "typescript";
  if (n.endsWith(".jsx") || n.endsWith(".js")) return "javascript";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".html")) return "html";
  if (n.endsWith(".css")) return "css";
  if (n.endsWith(".md")) return "markdown";
  return "plaintext";
}

export function FilesPanel() {
  const [activeFile, setActiveFile] = useState<FileNode | null>(
    MOCK_TREE[0]?.children?.[0]?.children?.[0]?.children?.[0] ?? null
  );
  const [editorContent, setEditorContent] = useState<string>(
    activeFile?.content ?? ""
  );
  const [openTabs, setOpenTabs] = useState<FileNode[]>(
    activeFile ? [activeFile] : []
  );
  const [activeTab, setActiveTab] = useState<FileNode | null>(activeFile);

  const openFile = (node: FileNode) => {
    if (node.type !== "file") return;
    setActiveFile(node);
    setActiveTab(node);
    setEditorContent(node.content ?? "");
    setOpenTabs((prev) => {
      if (prev.find((t) => t.name === node.name)) return prev;
      return [...prev, node];
    });
  };

  const closeTab = (node: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.name !== node.name);
      if (activeTab?.name === node.name) {
        const newActive = next[next.length - 1] ?? null;
        setActiveTab(newActive);
        setActiveFile(newActive);
        setEditorContent(newActive?.content ?? "");
      }
      return next;
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "rgba(10,12,20,0.98)" }}>
      {/* Left: File Tree */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: 220,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        {/* Tree header */}
        <div
          className="flex items-center px-3 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.4)" }}>
            Files
          </span>
        </div>

        {/* Tree scroll */}
        <div className="flex-1 overflow-y-auto py-1 px-1" style={{ scrollbarWidth: "thin" }}>
          {MOCK_TREE.map((node) => (
            <TreeNode
              key={node.name}
              node={node}
              depth={0}
              activeFile={activeFile}
              onSelect={openFile}
            />
          ))}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* File tabs */}
        <div
          className="flex items-center overflow-x-auto flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.015)",
            scrollbarWidth: "none",
          }}
        >
          {openTabs.map((tab) => (
            <div
              key={tab.name}
              onClick={() => {
                setActiveTab(tab);
                setActiveFile(tab);
                setEditorContent(tab.content ?? "");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 cursor-pointer flex-shrink-0 border-r transition-all",
                activeTab?.name === tab.name
                  ? "border-b-2 border-b-primary"
                  : "border-b-2 border-b-transparent"
              )}
              style={{
                borderRightColor: "rgba(255,255,255,0.07)",
                background: activeTab?.name === tab.name ? "rgba(255,255,255,0.05)" : "transparent",
              }}
              data-testid={`editor-tab-${tab.name}`}
            >
              {fileIcon(tab.name, "file")}
              <span
                className="text-[12px]"
                style={{
                  color: activeTab?.name === tab.name ? "rgba(226,232,240,0.9)" : "rgba(148,163,184,0.55)",
                }}
              >
                {tab.name}
              </span>
              <button
                onClick={(e) => closeTab(tab, e)}
                className="ml-1 w-4 h-4 flex items-center justify-center rounded opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: "rgba(148,163,184,0.8)" }}
                data-testid={`close-tab-${tab.name}`}
              >
                ×
              </button>
            </div>
          ))}

          {openTabs.length === 0 && (
            <div className="flex items-center justify-center flex-1 py-2">
              <span className="text-[11px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                Select a file to open
              </span>
            </div>
          )}
        </div>

        {/* Monaco Editor — always shown */}
        <div className="flex-1 overflow-hidden">
          <Editor
            key={activeTab?.name ?? "__empty__"}
            defaultValue={editorContent}
            language={langFor(activeTab)}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderLineHighlight: "line",
              padding: { top: 12, bottom: 12 },
              cursorBlinking: "smooth",
              smoothScrolling: true,
              contextmenu: true,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
            }}
            onChange={(val) => {
              if (val !== undefined) setEditorContent(val);
            }}
          />
        </div>

        {/* Status bar */}
        {activeTab && (
          <div
            className="flex items-center gap-3 px-3 py-1 flex-shrink-0"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(124,141,255,0.06)",
            }}
          >
            <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.45)" }}>
              {langFor(activeTab)}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.45)" }}>
              UTF-8
            </span>
            <span className="ml-auto text-[10px]" style={{ color: "rgba(124,141,255,0.6)" }}>
              {activeTab.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
