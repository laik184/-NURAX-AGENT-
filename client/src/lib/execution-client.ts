export interface ExecutionUpdate {
  type: string;
  sessionId: string;
  logs: string[];
  errors: Array<{
    message: string;
    file?: string;
    line?: number;
    column?: number;
    type: string;
  }>;
  status: string;
  duration: number;
}

export class ExecutionClient {
  private ws: WebSocket | null = null;
  private sessionId: string = "";
  private callbacks: {
    onUpdate: (update: ExecutionUpdate) => void;
    onError: (error: string) => void;
    onComplete: () => void;
  } = {
    onUpdate: () => {},
    onError: () => {},
    onComplete: () => {},
  };

  async executeCode(code: string, language: "js" | "ts" = "js"): Promise<void> {
    try {
      const response = await fetch("/api/solo-pilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error(`Execution request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionId = data.sessionId;

      if (!this.sessionId) {
        throw new Error("No session ID received from server");
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || "localhost:5000";
      const wsUrl = `${protocol}//${host}/ws/execute/${this.sessionId}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        const update = JSON.parse(event.data) as ExecutionUpdate;
        this.callbacks.onUpdate(update);

        if (update.status !== "running") {
          this.callbacks.onComplete();
          this.ws?.close();
        }
      };

      this.ws.onerror = (error) => {
        this.callbacks.onError("WebSocket error");
      };

      this.ws.onclose = () => {
        this.callbacks.onComplete();
      };
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : "Execution failed");
    }
  }

  stop(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
    }
  }

  onUpdate(callback: (update: ExecutionUpdate) => void): void {
    this.callbacks.onUpdate = callback;
  }

  onError(callback: (error: string) => void): void {
    this.callbacks.onError = callback;
  }

  onComplete(callback: () => void): void {
    this.callbacks.onComplete = callback;
  }
}
