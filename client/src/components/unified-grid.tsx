import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileExplorer } from "./file-explorer";

export default function UnifiedGrid() {
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [projectPath, setProjectPath] = useState("");

  // listen for projectPath from console SSE
  useEffect(() => {
    const es = new EventSource("/sse/console");
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.level === "project-path" && d.projectPath) {
          setProjectPath(d.projectPath);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  // load file when selection changes
  useEffect(() => {
    if (!selectedFile) {
      setFileContent("");
      return;
    }
    fetch(`/api/read-file?path=${encodeURIComponent(selectedFile)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setFileContent(j.content || "");
      })
      .catch(() => setFileContent(""));
  }, [selectedFile]);

  const detectLang = (f) => {
    if (f.endsWith(".ts") || f.endsWith(".tsx")) return "typescript";
    if (f.endsWith(".js") || f.endsWith(".jsx")) return "javascript";
    if (f.endsWith(".json")) return "json";
    if (f.endsWith(".html")) return "html";
    if (f.endsWith(".css")) return "css";
    return "plaintext";
  };

  const save = async () => {
    if (!selectedFile) return;
    await fetch("/api/save-file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filePath: selectedFile, content: fileContent }),
    });
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("file-saved", { detail: { path: selectedFile } })
        );
      } catch {
        window.dispatchEvent(new Event("file-saved"));
      }
    }
  };

  // global save (Ctrl+S from file explorer)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      save();
    };
    window.addEventListener("global-save", handler);
    return () => window.removeEventListener("global-save", handler);
  }, [selectedFile, fileContent]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <FileExplorer
        projectPath={projectPath}
        onSelect={setSelectedFile}
        activeFile={selectedFile}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            borderBottom: "1px solid #333",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#e5e7eb", fontSize: 13 }}>
            {selectedFile || "No file selected"}
          </span>
          <button
            onClick={save}
            style={{ marginLeft: "auto", padding: "2px 10px", fontSize: 12 }}
          >
            Save
          </button>
        </div>
        <Editor
          height="100%"
          language={detectLang(selectedFile)}
          value={fileContent}
          theme="vs-dark"
          onChange={(v) => {
            const next = v ?? "";
            setFileContent(next);
            if (typeof window !== "undefined" && selectedFile) {
              try {
                window.dispatchEvent(
                  new CustomEvent("file-dirty", { detail: { path: selectedFile } })
                );
              } catch {
                window.dispatchEvent(new Event("file-dirty"));
              }
            }
          }}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>
    </div>
  );
}
