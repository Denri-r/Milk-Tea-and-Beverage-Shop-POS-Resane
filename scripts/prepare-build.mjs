import { chmodSync, existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";

// OneDrive marks generated directories read-only on Windows. Node's build
// cleanup cannot remove them until this flag is cleared. Only touch .next.
if (process.platform === "win32") {
  const root = path.resolve(".next");
  function makeWritable(directory) {
    if (directory !== root && !directory.startsWith(root + path.sep)) {
      throw new Error(
        "Build directory is outside the workspace output folder.",
      );
    }
    if (!existsSync(directory) || lstatSync(directory).isSymbolicLink()) return;
    chmodSync(directory, 0o777);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink())
        makeWritable(path.join(directory, entry.name));
    }
  }
  makeWritable(root);
}
