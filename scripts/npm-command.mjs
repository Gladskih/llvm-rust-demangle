import { dirname, join } from "node:path";

export function npmCommand() {
  return process.platform === "win32"
    ? [process.execPath, process.env.npm_execpath ??
      join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js")]
    : ["npm"];
}
