import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../infrastructure/db/index.ts";
import { chatUploads } from "../../shared/schema.ts";
import { eq, and } from "drizzle-orm";

const UPLOAD_DIR = path.resolve("./uploads/chat");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", "text/plain", "text/csv",
  "application/json", "application/zip",
  "text/markdown",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const uid  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${uid}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

export function createChatUploadRouter(): Router {
  const router = Router();

  router.post("/upload", upload.array("files", 5), async (req, res) => {
    const projectId = Number(req.body?.projectId) || 0;
    const runId     = req.body?.runId ? String(req.body.runId) : null;
    const files     = req.files as Express.Multer.File[] | undefined;

    if (!projectId) {
      return res.status(400).json({ ok: false, error: "projectId is required" });
    }
    if (!files?.length) {
      return res.status(400).json({ ok: false, error: "at least one file is required" });
    }

    try {
      const inserted = await db
        .insert(chatUploads)
        .values(files.map((f) => ({
          projectId,
          runId,
          filename:   f.originalname,
          mimeType:   f.mimetype,
          storedPath: f.path,
          sizeBytes:  f.size,
        })))
        .returning();

      res.status(201).json({ ok: true, uploads: inserted });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  router.get("/uploads", async (req, res) => {
    const projectId = Number(req.query.projectId) || 0;
    const runId     = req.query.runId ? String(req.query.runId) : null;

    if (!projectId) {
      return res.status(400).json({ ok: false, error: "projectId is required" });
    }
    try {
      const condition = runId
        ? and(eq(chatUploads.projectId, projectId), eq(chatUploads.runId, runId))
        : eq(chatUploads.projectId, projectId);

      const rows = await db
        .select()
        .from(chatUploads)
        .where(condition)
        .limit(50);

      res.json({ ok: true, uploads: rows, count: rows.length });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return router;
}
