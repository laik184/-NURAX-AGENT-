import { pgTable, serial, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  framework: varchar("framework", { length: 64 }),
  sandboxPath: text("sandbox_path"),
  status: varchar("status", { length: 32 }).default("idle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),
  status: varchar("status", { length: 32 }).default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  result: jsonb("result"),
});

export const agentEvents = pgTable("agent_events", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 64 }).references(() => agentRuns.id, { onDelete: "cascade" }),
  phase: varchar("phase", { length: 64 }),
  agentName: varchar("agent_name", { length: 128 }),
  eventType: varchar("event_type", { length: 64 }),
  payload: jsonb("payload"),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
});

export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }),
  path: text("path"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const diffQueue = pgTable("diff_queue", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  oldContent: text("old_content"),
  newContent: text("new_content"),
  status: varchar("status", { length: 32 }).default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const consoleLogs = pgTable("console_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  stream: varchar("stream", { length: 16 }),
  line: text("line"),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;
export type AgentEventRow = typeof agentEvents.$inferSelect;
export type InsertAgentEvent = typeof agentEvents.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type InsertArtifact = typeof artifacts.$inferInsert;
export type DiffQueueItem = typeof diffQueue.$inferSelect;
export type InsertDiffQueueItem = typeof diffQueue.$inferInsert;
export type ConsoleLog = typeof consoleLogs.$inferSelect;
export type InsertConsoleLog = typeof consoleLogs.$inferInsert;

export interface Folder {
  id: number;
  name: string;
  projectIds?: number[];
  createdAt?: string;
}
export type InsertFolder = Omit<Folder, "id" | "createdAt">;
