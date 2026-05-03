import { useState } from "react";

export function useRun() {
  const [buildId, setBuildId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(goal: string) {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) throw new Error("Run failed");
      const data = await res.json();
      setBuildId(data.buildId || "latest");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return { run, buildId, running, error };
}