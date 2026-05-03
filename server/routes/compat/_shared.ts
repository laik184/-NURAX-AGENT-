import fs from "fs/promises";
import path from "path";
import multer from "multer";

export interface TreeNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: TreeNode[];
}

export async function buildTree(absDir: string, relBase = ""): Promise<TreeNode[]> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: TreeNode[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.name === "node_modules") continue;
    const childAbs = path.join(absDir, e.name);
    const childRel = relBase ? `${relBase}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push({
        name: e.name,
        type: "folder",
        path: childRel,
        children: await buildTree(childAbs, childRel),
      });
    } else {
      out.push({ name: e.name, type: "file", path: childRel });
    }
  }
  return out;
}

export function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
});
