import { useState } from "react";
import { ChevronDown, FileCode, FilePlus, FileEdit, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiffLineType = "add" | "remove" | "context" | "hunk";

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface FileDiff {
  filename: string;
  status: "created" | "modified" | "deleted";
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

interface FileDiffCardProps {
  diff: FileDiff;
}

function langFromFilename(name: string): string {
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return "tsx";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".md")) return "md";
  if (name.endsWith(".sql")) return "sql";
  return "txt";
}

const STATUS_META = {
  created: { label: "Created", color: "#4ade80", Icon: FilePlus },
  modified: { label: "Modified", color: "#7c8dff", Icon: FileEdit },
  deleted:  { label: "Deleted",  color: "#f87171", Icon: FileCode },
};

export function FileDiffCard({ diff }: FileDiffCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const { label, color, Icon } = STATUS_META[diff.status];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = diff.lines
      .filter((l) => l.type !== "hunk")
      .map((l) => l.content)
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shortName = diff.filename.split("/").pop() ?? diff.filename;
  const dir = diff.filename.includes("/")
    ? diff.filename.slice(0, diff.filename.lastIndexOf("/") + 1)
    : "";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.08)",
        animation: "diff-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <style>{`
        @keyframes diff-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors select-none cursor-pointer"
      >
        {/* File icon */}
        <div
          className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="h-3 w-3" style={{ color }} />
        </div>

        {/* Filename */}
        <span className="flex-1 min-w-0 text-left">
          <span className="text-[10.5px]" style={{ color: "rgba(148,163,184,0.5)" }}>{dir}</span>
          <span className="text-[11px] font-semibold" style={{ color: "rgba(226,232,240,0.9)" }}>{shortName}</span>
          <span
            className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase"
            style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
          >
            {label}
          </span>
        </span>

        {/* +/- counts */}
        <span className="flex items-center gap-1.5 flex-shrink-0 mr-1">
          {diff.additions > 0 && (
            <span className="text-[10px] font-mono font-medium" style={{ color: "#4ade80" }}>
              +{diff.additions}
            </span>
          )}
          {diff.deletions > 0 && (
            <span className="text-[10px] font-mono font-medium" style={{ color: "#f87171" }}>
              -{diff.deletions}
            </span>
          )}
        </span>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/8 transition-colors flex-shrink-0"
          style={{ color: copied ? "#4ade80" : "rgba(148,163,184,0.4)" }}
          title="Copy"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>

        {/* Chevron */}
        <ChevronDown
          className="h-3 w-3 flex-shrink-0 transition-transform duration-150"
          style={{
            color: "rgba(148,163,184,0.35)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>

      {/* ── Diff content ── */}
      {expanded && (
        <div
          className="overflow-x-auto text-[10.5px] font-mono"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <table className="w-full border-collapse">
            <tbody>
              {diff.lines.map((line, i) => {
                if (line.type === "hunk") {
                  return (
                    <tr key={i} style={{ background: "rgba(124,141,255,0.07)" }}>
                      <td
                        colSpan={3}
                        className="px-3 py-0.5 text-[9.5px] font-mono select-none"
                        style={{ color: "rgba(124,141,255,0.7)" }}
                      >
                        {line.content}
                      </td>
                    </tr>
                  );
                }

                const isAdd    = line.type === "add";
                const isRemove = line.type === "remove";

                return (
                  <tr
                    key={i}
                    style={{
                      background: isAdd
                        ? "rgba(74,222,128,0.07)"
                        : isRemove
                          ? "rgba(248,113,113,0.07)"
                          : "transparent",
                    }}
                  >
                    {/* Old line number */}
                    <td
                      className="px-2 py-0.5 text-right select-none w-7 flex-shrink-0"
                      style={{ color: "rgba(148,163,184,0.25)", minWidth: 28 }}
                    >
                      {!isAdd ? (line.oldLineNo ?? "") : ""}
                    </td>

                    {/* New line number */}
                    <td
                      className="px-2 py-0.5 text-right select-none w-7 flex-shrink-0"
                      style={{ color: "rgba(148,163,184,0.25)", minWidth: 28 }}
                    >
                      {!isRemove ? (line.newLineNo ?? "") : ""}
                    </td>

                    {/* +/- indicator */}
                    <td
                      className="px-1 py-0.5 select-none w-4 text-center flex-shrink-0"
                      style={{
                        color: isAdd
                          ? "rgba(74,222,128,0.8)"
                          : isRemove
                            ? "rgba(248,113,113,0.8)"
                            : "rgba(148,163,184,0.2)",
                        minWidth: 16,
                      }}
                    >
                      {isAdd ? "+" : isRemove ? "−" : " "}
                    </td>

                    {/* Code */}
                    <td
                      className="px-2 py-0.5 whitespace-pre"
                      style={{
                        color: isAdd
                          ? "rgba(187,247,208,0.9)"
                          : isRemove
                            ? "rgba(254,202,202,0.75)"
                            : "rgba(203,213,225,0.7)",
                      }}
                    >
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Mock diff generator — produces realistic diffs
   based on common React/TS patterns
───────────────────────────────────────────── */
export function generateMockDiffs(prompt: string): FileDiff[] {
  const p = prompt.toLowerCase();

  if (p.includes("button") || p.includes("component") || p.includes("ui") || p.includes("design")) {
    return [
      {
        filename: "client/src/components/Button.tsx",
        status: "created",
        additions: 28,
        deletions: 0,
        lines: [
          { type: "hunk", content: "@@ -0,0 +1,28 @@" },
          { type: "add", content: "import { cn } from '@/lib/utils';", newLineNo: 1 },
          { type: "add", content: "", newLineNo: 2 },
          { type: "add", content: "interface ButtonProps {", newLineNo: 3 },
          { type: "add", content: "  children: React.ReactNode;", newLineNo: 4 },
          { type: "add", content: "  variant?: 'primary' | 'secondary' | 'ghost';", newLineNo: 5 },
          { type: "add", content: "  size?: 'sm' | 'md' | 'lg';", newLineNo: 6 },
          { type: "add", content: "  onClick?: () => void;", newLineNo: 7 },
          { type: "add", content: "  disabled?: boolean;", newLineNo: 8 },
          { type: "add", content: "}", newLineNo: 9 },
          { type: "add", content: "", newLineNo: 10 },
          { type: "add", content: "export function Button({", newLineNo: 11 },
          { type: "add", content: "  children, variant = 'primary', size = 'md',", newLineNo: 12 },
          { type: "add", content: "  onClick, disabled,", newLineNo: 13 },
          { type: "add", content: "}: ButtonProps) {", newLineNo: 14 },
          { type: "add", content: "  return (", newLineNo: 15 },
          { type: "add", content: "    <button", newLineNo: 16 },
          { type: "add", content: "      onClick={onClick}", newLineNo: 17 },
          { type: "add", content: "      disabled={disabled}", newLineNo: 18 },
          { type: "add", content: "      className={cn(", newLineNo: 19 },
          { type: "add", content: "        'rounded-lg font-medium transition-all',", newLineNo: 20 },
          { type: "add", content: "        variant === 'primary' && 'bg-primary text-white',", newLineNo: 21 },
          { type: "add", content: "        size === 'sm' && 'px-3 py-1.5 text-sm',", newLineNo: 22 },
          { type: "add", content: "        size === 'md' && 'px-4 py-2 text-base',", newLineNo: 23 },
          { type: "add", content: "      )}", newLineNo: 24 },
          { type: "add", content: "    >", newLineNo: 25 },
          { type: "add", content: "      {children}", newLineNo: 26 },
          { type: "add", content: "    </button>", newLineNo: 27 },
          { type: "add", content: "  );", newLineNo: 28 },
          { type: "add", content: "}", newLineNo: 29 },
        ],
      },
      {
        filename: "client/src/App.tsx",
        status: "modified",
        additions: 3,
        deletions: 1,
        lines: [
          { type: "hunk", content: "@@ -1,7 +1,9 @@" },
          { type: "context", content: "import { Switch, Route } from 'wouter';", oldLineNo: 1, newLineNo: 1 },
          { type: "remove", content: "import Home from '@/pages/home';", oldLineNo: 2 },
          { type: "add", content: "import Home from '@/pages/home';", newLineNo: 2 },
          { type: "add", content: "import { Button } from '@/components/Button';", newLineNo: 3 },
          { type: "add", content: "import { ButtonDemo } from '@/components/ButtonDemo';", newLineNo: 4 },
          { type: "context", content: "", oldLineNo: 3, newLineNo: 5 },
          { type: "context", content: "export default function App() {", oldLineNo: 4, newLineNo: 6 },
        ],
      },
    ];
  }

  if (p.includes("auth") || p.includes("login") || p.includes("user")) {
    return [
      {
        filename: "client/src/pages/login.tsx",
        status: "created",
        additions: 42,
        deletions: 0,
        lines: [
          { type: "hunk", content: "@@ -0,0 +1,42 @@" },
          { type: "add", content: "import { useState } from 'react';", newLineNo: 1 },
          { type: "add", content: "import { useLocation } from 'wouter';", newLineNo: 2 },
          { type: "add", content: "", newLineNo: 3 },
          { type: "add", content: "export default function LoginPage() {", newLineNo: 4 },
          { type: "add", content: "  const [email, setEmail] = useState('');", newLineNo: 5 },
          { type: "add", content: "  const [password, setPassword] = useState('');", newLineNo: 6 },
          { type: "add", content: "  const [, navigate] = useLocation();", newLineNo: 7 },
          { type: "add", content: "", newLineNo: 8 },
          { type: "add", content: "  const handleSubmit = async (e: React.FormEvent) => {", newLineNo: 9 },
          { type: "add", content: "    e.preventDefault();", newLineNo: 10 },
          { type: "add", content: "    // auth logic here", newLineNo: 11 },
          { type: "add", content: "    navigate('/dashboard');", newLineNo: 12 },
          { type: "add", content: "  };", newLineNo: 13 },
          { type: "add", content: "", newLineNo: 14 },
          { type: "add", content: "  return (", newLineNo: 15 },
          { type: "add", content: "    <div className='min-h-screen flex items-center justify-center'>", newLineNo: 16 },
          { type: "add", content: "      <form onSubmit={handleSubmit} className='w-full max-w-sm space-y-4'>", newLineNo: 17 },
          { type: "add", content: "        <h1 className='text-2xl font-bold'>Sign in</h1>", newLineNo: 18 },
          { type: "add", content: "        <input type='email' value={email}", newLineNo: 19 },
          { type: "add", content: "          onChange={(e) => setEmail(e.target.value)} />", newLineNo: 20 },
          { type: "add", content: "        <input type='password' value={password}", newLineNo: 21 },
          { type: "add", content: "          onChange={(e) => setPassword(e.target.value)} />", newLineNo: 22 },
          { type: "add", content: "        <button type='submit'>Sign in</button>", newLineNo: 23 },
          { type: "add", content: "      </form>", newLineNo: 24 },
          { type: "add", content: "    </div>", newLineNo: 25 },
          { type: "add", content: "  );", newLineNo: 26 },
          { type: "add", content: "}", newLineNo: 27 },
        ],
      },
      {
        filename: "server/routes.ts",
        status: "modified",
        additions: 18,
        deletions: 2,
        lines: [
          { type: "hunk", content: "@@ -12,8 +12,24 @@" },
          { type: "context", content: "import { storage } from './storage';", oldLineNo: 12, newLineNo: 12 },
          { type: "context", content: "import { z } from 'zod';", oldLineNo: 13, newLineNo: 13 },
          { type: "remove", content: "// TODO: add auth routes", oldLineNo: 14 },
          { type: "remove", content: "// TODO: add user routes", oldLineNo: 15 },
          { type: "add", content: "import bcrypt from 'bcryptjs';", newLineNo: 14 },
          { type: "add", content: "import jwt from 'jsonwebtoken';", newLineNo: 15 },
          { type: "add", content: "", newLineNo: 16 },
          { type: "add", content: "app.post('/api/auth/login', async (req, res) => {", newLineNo: 17 },
          { type: "add", content: "  const { email, password } = req.body;", newLineNo: 18 },
          { type: "add", content: "  const user = await storage.getUserByEmail(email);", newLineNo: 19 },
          { type: "add", content: "  if (!user) return res.status(401).json({ error: 'Invalid credentials' });", newLineNo: 20 },
          { type: "add", content: "  const valid = await bcrypt.compare(password, user.passwordHash);", newLineNo: 21 },
          { type: "add", content: "  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });", newLineNo: 22 },
          { type: "add", content: "  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);", newLineNo: 23 },
          { type: "add", content: "  res.json({ token });", newLineNo: 24 },
          { type: "add", content: "});", newLineNo: 25 },
        ],
      },
      {
        filename: "shared/schema.ts",
        status: "modified",
        additions: 8,
        deletions: 0,
        lines: [
          { type: "hunk", content: "@@ -1,4 +1,12 @@" },
          { type: "context", content: "import { pgTable, text, integer } from 'drizzle-orm/pg-core';", oldLineNo: 1, newLineNo: 1 },
          { type: "context", content: "", oldLineNo: 2, newLineNo: 2 },
          { type: "add", content: "export const users = pgTable('users', {", newLineNo: 3 },
          { type: "add", content: "  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),", newLineNo: 4 },
          { type: "add", content: "  email: text('email').notNull().unique(),", newLineNo: 5 },
          { type: "add", content: "  passwordHash: text('password_hash').notNull(),", newLineNo: 6 },
          { type: "add", content: "  name: text('name'),", newLineNo: 7 },
          { type: "add", content: "  createdAt: text('created_at').notNull(),", newLineNo: 8 },
          { type: "add", content: "});", newLineNo: 9 },
        ],
      },
    ];
  }

  if (p.includes("database") || p.includes("api") || p.includes("backend") || p.includes("storage")) {
    return [
      {
        filename: "server/storage.ts",
        status: "modified",
        additions: 22,
        deletions: 4,
        lines: [
          { type: "hunk", content: "@@ -8,12 +8,30 @@" },
          { type: "context", content: "export interface IStorage {", oldLineNo: 8, newLineNo: 8 },
          { type: "remove", content: "  // TODO: add methods", oldLineNo: 9 },
          { type: "remove", content: "}", oldLineNo: 10 },
          { type: "add", content: "  getItems(): Promise<Item[]>;", newLineNo: 9 },
          { type: "add", content: "  getItemById(id: number): Promise<Item | undefined>;", newLineNo: 10 },
          { type: "add", content: "  createItem(item: InsertItem): Promise<Item>;", newLineNo: 11 },
          { type: "add", content: "  updateItem(id: number, data: Partial<InsertItem>): Promise<Item>;", newLineNo: 12 },
          { type: "add", content: "  deleteItem(id: number): Promise<void>;", newLineNo: 13 },
          { type: "add", content: "}", newLineNo: 14 },
        ],
      },
      {
        filename: "server/routes.ts",
        status: "modified",
        additions: 30,
        deletions: 0,
        lines: [
          { type: "hunk", content: "@@ -20,6 +20,36 @@" },
          { type: "context", content: "export function registerRoutes(app: Express) {", oldLineNo: 20, newLineNo: 20 },
          { type: "add", content: "  app.get('/api/items', async (req, res) => {", newLineNo: 21 },
          { type: "add", content: "    const items = await storage.getItems();", newLineNo: 22 },
          { type: "add", content: "    res.json(items);", newLineNo: 23 },
          { type: "add", content: "  });", newLineNo: 24 },
          { type: "add", content: "", newLineNo: 25 },
          { type: "add", content: "  app.post('/api/items', async (req, res) => {", newLineNo: 26 },
          { type: "add", content: "    const data = insertItemSchema.parse(req.body);", newLineNo: 27 },
          { type: "add", content: "    const item = await storage.createItem(data);", newLineNo: 28 },
          { type: "add", content: "    res.status(201).json(item);", newLineNo: 29 },
          { type: "add", content: "  });", newLineNo: 30 },
          { type: "add", content: "", newLineNo: 31 },
          { type: "add", content: "  app.delete('/api/items/:id', async (req, res) => {", newLineNo: 32 },
          { type: "add", content: "    await storage.deleteItem(Number(req.params.id));", newLineNo: 33 },
          { type: "add", content: "    res.status(204).end();", newLineNo: 34 },
          { type: "add", content: "  });", newLineNo: 35 },
        ],
      },
      {
        filename: "shared/schema.ts",
        status: "modified",
        additions: 12,
        deletions: 0,
        lines: [
          { type: "hunk", content: "@@ -1,3 +1,15 @@" },
          { type: "context", content: "import { pgTable, text, integer } from 'drizzle-orm/pg-core';", oldLineNo: 1, newLineNo: 1 },
          { type: "add", content: "import { createInsertSchema } from 'drizzle-zod';", newLineNo: 2 },
          { type: "add", content: "import { z } from 'zod';", newLineNo: 3 },
          { type: "add", content: "", newLineNo: 4 },
          { type: "add", content: "export const items = pgTable('items', {", newLineNo: 5 },
          { type: "add", content: "  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),", newLineNo: 6 },
          { type: "add", content: "  name: text('name').notNull(),", newLineNo: 7 },
          { type: "add", content: "  description: text('description'),", newLineNo: 8 },
          { type: "add", content: "  status: text('status').notNull().default('active'),", newLineNo: 9 },
          { type: "add", content: "});", newLineNo: 10 },
          { type: "add", content: "", newLineNo: 11 },
          { type: "add", content: "export const insertItemSchema = createInsertSchema(items).omit({ id: true });", newLineNo: 12 },
          { type: "add", content: "export type InsertItem = z.infer<typeof insertItemSchema>;", newLineNo: 13 },
          { type: "add", content: "export type Item = typeof items.$inferSelect;", newLineNo: 14 },
        ],
      },
    ];
  }

  /* ── default / generic ── */
  return [
    {
      filename: "client/src/pages/home.tsx",
      status: "modified",
      additions: 14,
      deletions: 6,
      lines: [
        { type: "hunk", content: "@@ -5,14 +5,22 @@" },
        { type: "context", content: "import { useState } from 'react';", oldLineNo: 5, newLineNo: 5 },
        { type: "context", content: "", oldLineNo: 6, newLineNo: 6 },
        { type: "remove", content: "export default function Home() {", oldLineNo: 7 },
        { type: "remove", content: "  return <div>Hello</div>;", oldLineNo: 8 },
        { type: "remove", content: "}", oldLineNo: 9 },
        { type: "add", content: "export default function Home() {", newLineNo: 7 },
        { type: "add", content: "  const [count, setCount] = useState(0);", newLineNo: 8 },
        { type: "add", content: "", newLineNo: 9 },
        { type: "add", content: "  return (", newLineNo: 10 },
        { type: "add", content: "    <main className='flex flex-col items-center gap-6 p-8'>", newLineNo: 11 },
        { type: "add", content: "      <h1 className='text-3xl font-bold tracking-tight'>", newLineNo: 12 },
        { type: "add", content: "        Welcome", newLineNo: 13 },
        { type: "add", content: "      </h1>", newLineNo: 14 },
        { type: "add", content: "      <button onClick={() => setCount((c) => c + 1)}>", newLineNo: 15 },
        { type: "add", content: "        Count: {count}", newLineNo: 16 },
        { type: "add", content: "      </button>", newLineNo: 17 },
        { type: "add", content: "    </main>", newLineNo: 18 },
        { type: "add", content: "  );", newLineNo: 19 },
        { type: "add", content: "}", newLineNo: 20 },
      ],
    },
    {
      filename: "client/src/index.css",
      status: "modified",
      additions: 6,
      deletions: 0,
      lines: [
        { type: "hunk", content: "@@ -42,6 +42,12 @@" },
        { type: "context", content: "  --radius: 0.5rem;", oldLineNo: 42, newLineNo: 42 },
        { type: "context", content: "}", oldLineNo: 43, newLineNo: 43 },
        { type: "add", content: "", newLineNo: 44 },
        { type: "add", content: ".hero-gradient {", newLineNo: 45 },
        { type: "add", content: "  background: linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%);", newLineNo: 46 },
        { type: "add", content: "  -webkit-background-clip: text;", newLineNo: 47 },
        { type: "add", content: "  -webkit-text-fill-color: transparent;", newLineNo: 48 },
        { type: "add", content: "}", newLineNo: 49 },
      ],
    },
  ];
}
