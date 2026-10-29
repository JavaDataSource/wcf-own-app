import { describe, expect, it } from "vitest";
import { openPathCommand } from "../../server/platform.js";

describe("桌面系统命令", () => {
  it("在 macOS 使用 open", () => {
    expect(openPathCommand("/Users/shifeng/Documents", "darwin")).toEqual({
      command: "open",
      args: ["/Users/shifeng/Documents"],
    });
  });

  it("在 Windows 使用 explorer.exe 并保留带空格路径", () => {
    expect(openPathCommand("C:\\Users\\Shifeng User\\AppData\\Local\\ShifengWorkspace", "win32")).toEqual({
      command: "explorer.exe",
      args: ["C:\\Users\\Shifeng User\\AppData\\Local\\ShifengWorkspace"],
    });
  });
});
