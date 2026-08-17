import { describe, expect, it } from "vitest";
import { directoryOpenCommand } from "./openDirectory";

describe("directoryOpenCommand", () => {
  it("uses Explorer on Windows", () => {
    expect(directoryOpenCommand("C:\\Projects\\Demo", "win32")).toEqual({
      command: "explorer.exe",
      args: ["C:\\Projects\\Demo"],
    });
  });

  it("uses the native opener on macOS and Linux", () => {
    expect(directoryOpenCommand("/projects/demo", "darwin").command).toBe("open");
    expect(directoryOpenCommand("/projects/demo", "linux").command).toBe("xdg-open");
  });
});
