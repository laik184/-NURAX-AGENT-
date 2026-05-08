import { useState } from "react";
import { FileArchive, Folder, FolderOpen, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportOption } from "./import-options-data";

export type ZipPhase = "idle" | "processing" | "done";

export interface FakeFileNode {
  name: string;
  type: "file" | "folder";
  children?: FakeFileNode[];
}

export function buildFakeTree(zipName: string): FakeFileNode[] {
  const base = zipName.replace(/\.zip$/i, "");
  return [
    {
      name: base,
      type: "folder",
      children: [
        {
          name: "src",
          type: "folder",
          children: [
            { name: "index.ts", type: "file" },
            { name: "app.ts", type: "file" },
            { name: "utils.ts", type: "file" },
          ],
        },
        {
          name: "public",
          type: "folder",
          children: [
            { name: "index.html", type: "file" },
            { name: "styles.css", type: "file" },
          ],
        },
        { name: "package.json", type: "file" },
        { name: "README.md", type: "file" },
        { name: "tsconfig.json", type: "file" },
      ],
    },
  ];
}

export function FakeTreeNode({ node, depth = 0 }: { node: FakeFileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          style={{ paddingLeft: depth * 14 }}
        >
          {open ? <FolderOpen className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />}
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <FakeTreeNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground"
      style={{ paddingLeft: depth * 14 }}
    >
      <File className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span>{node.name}</span>
    </div>
  );
}

export function OptionIcon({ option }: { option: ImportOption }) {
  const Icon = option.id === "zip"
    ? FileArchive
    : (option.icon as React.ElementType);
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", option.iconBg)}>
      <Icon className={cn("w-5 h-5", option.iconColor)} />
    </div>
  );
}
