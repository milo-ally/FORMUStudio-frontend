// Cross-platform port killer. Usage: bun run scripts/kill-port.ts [port]
import { execSync } from "node:child_process";

const port = process.argv[2] || "3001";

try {
  if (process.platform === "win32") {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set<string>();
    for (const line of out.split(/[\r\n]+/)) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes("LISTENING")) continue;
      const parts = trimmed.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) {
        if (!pids.has(pid)) {
          pids.add(pid);
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        }
      }
    }
  } else {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
  }
} catch {
  // Port is free or process doesn't exist — that's fine
}
