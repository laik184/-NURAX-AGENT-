import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, X, ArrowRight, Upload, Link2, Plus, ChevronRight, FileArchive, Code2, Palette, Files, Folder, FolderOpen, File, CheckCircle2, Loader2 } from "lucide-react";
import { SiGithub, SiFigma, SiBitbucket } from "react-icons/si";
import { cn } from "@/lib/utils";
import { useImportModal } from "@/context/import-modal-context";

const categories = [
  { id: "all", label: "All", icon: ArrowRight },
  { id: "code", label: "Code", icon: Code2 },
  { id: "design", label: "Design", icon: Palette },
  { id: "files", label: "Files", icon: Files },
];

const importOptions = [
  {
    id: "github",
    title: "GitHub",
    description: "Import any repository or existing app. Agent may be less predictable.",
    icon: SiGithub,
    iconBg: "bg-[#24292e]",
    iconColor: "text-white",
    category: "code",
    action: "connect",
    actionLabel: "Connect GitHub",
    detailDescription: "Link your GitHub account to browse and import any public or private repository directly into your workspace.",
    route: "/import/github",
  },
  {
    id: "bitbucket",
    title: "Bitbucket",
    description: "Import a repository or existing app. Agent support may be limited.",
    icon: SiBitbucket,
    iconBg: "bg-[#0052cc]",
    iconColor: "text-white",
    category: "code",
    action: "connect",
    actionLabel: "Connect Bitbucket",
    detailDescription: "Authenticate with Bitbucket and import any of your repositories to get started quickly.",
    route: null,
  },
  {
    id: "bolt",
    title: "Bolt",
    description: "Migrate your prototype to make it production-ready.",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    ),
    iconBg: "bg-[#4a90e2]",
    iconColor: "text-white",
    category: "code",
    action: "connect",
    actionLabel: "Import from Bolt",
    detailDescription: "Migrate your Bolt prototype into a production-ready environment with full Agent support.",
    route: "/import/bolt",
  },
  {
    id: "vercel",
    title: "Vercel",
    description: "Migrate your site to make it production-ready.",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2L2 22h20L12 2z" />
      </svg>
    ),
    iconBg: "bg-[#000000]",
    iconColor: "text-white",
    category: "code",
    action: "connect",
    actionLabel: "Import from Vercel",
    detailDescription: "Pull your Vercel project and continue development with full deployment capabilities.",
    route: "/import/vercel",
  },
  {
    id: "figma",
    title: "Figma Design",
    description: "Convert your designs into live Apps using Agent.",
    icon: SiFigma,
    iconBg: "bg-gradient-to-br from-[#f24e1e] via-[#a259ff] to-[#1abcfe]",
    iconColor: "text-white",
    category: "design",
    action: "connect",
    actionLabel: "Connect Figma",
    detailDescription: "Import your Figma frames and let the Agent convert them into fully working React components.",
    route: "/import/figma",
  },
  {
    id: "lovable",
    title: "Lovable",
    description: "Migrate your site to make it production-ready.",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
      </svg>
    ),
    iconBg: "bg-[#ff6b6b]",
    iconColor: "text-white",
    category: "design",
    action: "connect",
    actionLabel: "Import from Lovable",
    detailDescription: "Migrate your Lovable project and continue building with the full power of the Agent.",
    route: "/import/lovable",
  },
  {
    id: "base44",
    title: "Base44",
    description: "Migrate your site to make it production-ready.",
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">44</text>
      </svg>
    ),
    iconBg: "bg-[#2d2d2d]",
    iconColor: "text-white",
    category: "design",
    action: "connect",
    actionLabel: "Import from Base44",
    detailDescription: "Bring your Base44 project into a production environment with zero configuration.",
    route: "/import/base44",
  },
  {
    id: "zip",
    title: "Zip File",
    description: "Import from a .zip file.",
    icon: FileArchive,
    iconBg: "bg-[#f59e0b]/20",
    iconColor: "text-[#f59e0b]",
    category: "files",
    action: "upload",
    actionLabel: "Upload .zip File",
    detailDescription: "Drag and drop or browse to upload a .zip archive. We'll extract and set it up automatically.",
    route: null,
  },
];

function OptionIcon({ option }: { option: typeof importOptions[0] }) {
  const Icon = option.icon as React.ElementType;
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", option.iconBg)}>
      <Icon className={cn("w-5 h-5", option.iconColor)} />
    </div>
  );
}

type ZipPhase = "idle" | "processing" | "done";

interface FakeFileNode {
  name: string;
  type: "file" | "folder";
  children?: FakeFileNode[];
}

function buildFakeTree(zipName: string): FakeFileNode[] {
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

function FakeTreeNode({ node, depth = 0 }: { node: FakeFileNode; depth?: number }) {
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

export function ImportModal() {
  const { open, closeImport } = useImportModal();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedOption, setSelectedOption] = useState<typeof importOptions[0] | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipPhase, setZipPhase] = useState<ZipPhase>("idle");
  const [extractedTree, setExtractedTree] = useState<FakeFileNode[]>([]);
  const [extractProgress, setExtractProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      setTimeout(() => searchRef.current?.focus(), 150);
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setMounted(false);
        setSelectedOption(null);
        setSearch("");
        setSelectedCategory("all");
        setZipFile(null);
        setZipPhase("idle");
        setExtractedTree([]);
        setExtractProgress(0);
      }, 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleZipFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFile(file);
    setZipPhase("processing");
    setExtractProgress(0);

    // Simulate extraction progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setExtractProgress(100);
        setExtractedTree(buildFakeTree(file.name));
        setZipPhase("done");
      } else {
        setExtractProgress(Math.floor(progress));
      }
    }, 180);

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleOpenInWorkspace() {
    closeImport();
    setLocation("/workspace?library=true");
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImport();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeImport]);

  const filtered = importOptions.filter((opt) => {
    const matchesCategory = selectedCategory === "all" || opt.category === selectedCategory;
    const matchesSearch =
      search.trim() === "" ||
      opt.title.toLowerCase().includes(search.toLowerCase()) ||
      opt.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handleOptionClick(opt: typeof importOptions[0]) {
    setSelectedOption(opt);
  }

  function handleAction() {
    if (selectedOption?.route) {
      closeImport();
      setLocation(selectedOption.route);
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        onClick={closeImport}
        data-testid="import-modal-backdrop"
      />

      {/* Desktop Modal */}
      <div
        className={cn(
          "fixed z-50 inset-0 items-center justify-center hidden md:flex pointer-events-none"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto w-full max-w-3xl mx-4 rounded-2xl overflow-hidden transition-all duration-300",
            "border border-white/10",
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          )}
          style={{
            background: "linear-gradient(135deg, hsl(222,30%,9%) 0%, hsl(220,25%,11%) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,141,255,0.08)",
          }}
          data-testid="import-modal-desktop"
        >
          {/* Search bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Import anything..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedOption(null);
              }}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
              data-testid="input-import-search"
            />
            <button
              onClick={closeImport}
              className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
              data-testid="button-close-import"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex" style={{ minHeight: 420, maxHeight: "60vh" }}>
            {/* Left: Categories */}
            <div className="w-44 flex-shrink-0 border-r border-white/8 py-3 px-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                Categories
              </p>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedOption(null);
                    }}
                    data-testid={`button-category-${cat.id}`}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Right: Options list or detail view */}
            <div className="flex-1 overflow-y-auto">
              {selectedOption ? (
                /* Detail view */
                <div className="p-6 flex flex-col h-full">
                  <button
                    onClick={() => { setSelectedOption(null); setZipFile(null); setZipPhase("idle"); setExtractedTree([]); setExtractProgress(0); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
                    data-testid="button-back-to-list"
                  >
                    <ChevronRight className="w-3 h-3 rotate-180" />
                    Back
                  </button>

                  <div className="flex items-start gap-4 mb-5">
                    <OptionIcon option={selectedOption} />
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{selectedOption.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedOption.description}</p>
                    </div>
                  </div>

                  {/* ZIP-specific flow */}
                  {selectedOption.id === "zip" ? (
                    <>
                      <input
                        ref={zipInputRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={handleZipFileChange}
                        data-testid="input-zip-file"
                      />

                      {zipPhase === "idle" && (
                        <>
                          <div
                            className="rounded-xl p-4 mb-6 text-sm text-muted-foreground leading-relaxed"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                          >
                            {selectedOption.detailDescription}
                          </div>
                          <div className="flex gap-3 mt-auto">
                            <button
                              onClick={() => zipInputRef.current?.click()}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                              style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.3)" }}
                              data-testid="button-action-upload"
                            >
                              <Upload className="w-4 h-4" />
                              {selectedOption.actionLabel}
                            </button>
                            <button
                              onClick={() => setSelectedOption(null)}
                              className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/6 transition-all duration-200"
                              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                              data-testid="button-action-cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}

                      {zipPhase === "processing" && (
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin text-[#7c8dff]" />
                            <span>Extracting <span className="text-foreground font-medium">{zipFile?.name}</span>…</span>
                          </div>
                          <div className="rounded-xl overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${extractProgress}%`, background: "linear-gradient(90deg, #7c8dff, #a78bfa)", transition: "width 0.15s ease" }} />
                          </div>
                          <p className="text-xs text-muted-foreground mb-4">{extractProgress}% — reading archive…</p>
                        </div>
                      )}

                      {zipPhase === "done" && (
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-3 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-foreground font-medium">Extracted successfully</span>
                            <span className="text-muted-foreground">— {zipFile?.name}</span>
                          </div>
                          <div
                            className="rounded-xl p-3 mb-5 flex-1 overflow-y-auto text-xs font-mono"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", maxHeight: 180 }}
                          >
                            {extractedTree.map((node) => (
                              <FakeTreeNode key={node.name} node={node} depth={0} />
                            ))}
                          </div>
                          <div className="flex gap-3 mt-auto">
                            <button
                              onClick={handleOpenInWorkspace}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                              style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.3)" }}
                              data-testid="button-open-workspace"
                            >
                              <FolderOpen className="w-4 h-4" />
                              Open in Workspace
                            </button>
                            <button
                              onClick={() => { setZipFile(null); setZipPhase("idle"); setExtractedTree([]); setExtractProgress(0); }}
                              className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/6 transition-all duration-200"
                              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                              data-testid="button-upload-another"
                            >
                              Upload another
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Generic detail for non-zip options */
                    <>
                      <div
                        className="rounded-xl p-4 mb-6 text-sm text-muted-foreground leading-relaxed"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        {selectedOption.detailDescription}
                      </div>
                      <div className="flex gap-3 mt-auto">
                        <button
                          onClick={handleAction}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.3)" }}
                          data-testid="button-action-connect"
                        >
                          {selectedOption.action === "create" ? <Plus className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                          {selectedOption.actionLabel}
                        </button>
                        <button
                          onClick={() => setSelectedOption(null)}
                          className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/6 transition-all duration-200"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                          data-testid="button-action-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Options list */
                <div className="py-2">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                      <Search className="w-8 h-8 mb-3 opacity-30" />
                      <p className="text-sm">No results for "{search}"</p>
                    </div>
                  ) : (
                    filtered.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionClick(opt)}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all duration-150 group",
                          "hover:bg-white/5 active:bg-white/8"
                        )}
                        data-testid={`button-import-option-${opt.id}`}
                      >
                        <OptionIcon option={opt} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{opt.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{opt.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} option{filtered.length !== 1 ? "s" : ""} available
            </p>
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/8 text-[10px] font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 md:hidden transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: "88dvh" }}
        data-testid="import-modal-mobile"
      >
        <div
          className="rounded-t-2xl overflow-hidden flex flex-col"
          style={{
            background: "hsl(222,30%,9%)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(124,141,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderBottom: "none",
            maxHeight: "88dvh",
          }}
        >
          {/* Handle + header */}
          <div className="flex-shrink-0">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-base font-semibold text-foreground">Import</h2>
              <button
                onClick={closeImport}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                data-testid="button-close-import-mobile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 pb-3">
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Import anything..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedOption(null);
                  }}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                  data-testid="input-import-search-mobile"
                />
              </div>
            </div>
            {/* Category pills */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedOption(null);
                  }}
                  data-testid={`button-mobile-category-${cat.id}`}
                  className={cn(
                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                    selectedCategory === cat.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground border border-white/10 hover:border-white/20 hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {selectedOption ? (
              <div className="px-5 pt-2 pb-8">
                <button
                  onClick={() => { setSelectedOption(null); setZipFile(null); setZipPhase("idle"); setExtractedTree([]); setExtractProgress(0); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 py-1"
                  data-testid="button-back-to-list-mobile"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  Back
                </button>
                <div className="flex items-start gap-4 mb-4">
                  <OptionIcon option={selectedOption} />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{selectedOption.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{selectedOption.description}</p>
                  </div>
                </div>

                {selectedOption.id === "zip" ? (
                  <>
                    {zipPhase === "idle" && (
                      <>
                        <div
                          className="rounded-xl p-4 mb-5 text-sm text-muted-foreground leading-relaxed"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {selectedOption.detailDescription}
                        </div>
                        <button
                          onClick={() => zipInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.25)" }}
                          data-testid="button-action-upload-mobile"
                        >
                          <Upload className="w-4 h-4" />
                          {selectedOption.actionLabel}
                        </button>
                      </>
                    )}
                    {zipPhase === "processing" && (
                      <>
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-[#7c8dff]" />
                          <span>Extracting <span className="text-foreground font-medium">{zipFile?.name}</span>…</span>
                        </div>
                        <div className="rounded-xl overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${extractProgress}%`, background: "linear-gradient(90deg, #7c8dff, #a78bfa)", transition: "width 0.15s ease" }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{extractProgress}% — reading archive…</p>
                      </>
                    )}
                    {zipPhase === "done" && (
                      <>
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-foreground font-medium">Extracted successfully</span>
                        </div>
                        <div
                          className="rounded-xl p-3 mb-5 overflow-y-auto text-xs font-mono"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", maxHeight: 160 }}
                        >
                          {extractedTree.map((node) => (
                            <FakeTreeNode key={node.name} node={node} depth={0} />
                          ))}
                        </div>
                        <button
                          onClick={handleOpenInWorkspace}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95 mb-3"
                          style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.25)" }}
                          data-testid="button-open-workspace-mobile"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Open in Workspace
                        </button>
                        <button
                          onClick={() => { setZipFile(null); setZipPhase("idle"); setExtractedTree([]); setExtractProgress(0); }}
                          className="w-full py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                          data-testid="button-upload-another-mobile"
                        >
                          Upload another
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="rounded-xl p-4 mb-5 text-sm text-muted-foreground leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {selectedOption.detailDescription}
                    </div>
                    <button
                      onClick={handleAction}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #7c8dff, #a78bfa)", boxShadow: "0 0 20px rgba(124,141,255,0.25)" }}
                      data-testid="button-action-mobile"
                    >
                      <Link2 className="w-4 h-4" />
                      {selectedOption.actionLabel}
                    </button>
                  </>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <Search className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">No results for "{search}"</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors active:bg-white/8"
                    data-testid={`button-mobile-import-option-${opt.id}`}
                  >
                    <OptionIcon option={opt} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{opt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
