import path from "node:path";

export function defaultDataRootFor(platform, environment, homeDirectory) {
  const platformPath = platform === "win32" ? path.win32 : path.posix;
  if (platform === "win32") {
    return platformPath.join(environment.LOCALAPPDATA ?? environment.APPDATA ?? homeDirectory, "ShifengWorkspace");
  }
  if (platform === "darwin") {
    return platformPath.join(homeDirectory, "Library", "Application Support", "ShifengWorkspace");
  }
  return platformPath.join(environment.XDG_DATA_HOME ?? platformPath.join(homeDirectory, ".local", "share"), "ShifengWorkspace");
}

export function npmCommandFor(platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

export function browserOpenCommandFor(platform, url) {
  if (platform === "darwin") return { command: "open", args: [url] };
  if (platform === "win32") return { command: "cmd.exe", args: ["/d", "/s", "/c", "start", "", url] };
  return { command: "xdg-open", args: [url] };
}
