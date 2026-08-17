import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";

export function directoryOpenCommand(
  directory: string,
  platform: NodeJS.Platform = process.platform
): { command: string; args: string[] } {
  if (platform === "win32") return { command: "explorer.exe", args: [directory] };
  if (platform === "darwin") return { command: "open", args: [directory] };
  return { command: "xdg-open", args: [directory] };
}

export async function openDirectory(directory: string): Promise<void> {
  const stat = await fs.stat(directory).catch(() => null);
  if (!stat?.isDirectory()) throw new Error("Project directory is unavailable");
  const { command, args } = directoryOpenCommand(directory);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}
