const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const roots = [path.join(projectRoot, "src"), path.join(projectRoot, "server.js")];

const shouldSkipDir = (dir) => {
  const skipNames = ["node_modules", "Front-end Presensi", ".npm-cache", "uploads", "templates"];
  return skipNames.some((name) => dir.includes(path.sep + name + path.sep));
};

const collectJsFiles = (entry) => {
  const files = [];
  if (!fs.existsSync(entry)) return files;

  const stat = fs.statSync(entry);
  if (stat.isFile() && entry.endsWith(".js")) {
    files.push(entry);
    return files;
  }

  if (!stat.isDirectory()) return files;

  const stack = [entry];
  while (stack.length) {
    const current = stack.pop();
    if (shouldSkipDir(current)) continue;

    for (const item of fs.readdirSync(current)) {
      const fullPath = path.join(current, item);
      const itemStat = fs.statSync(fullPath);
      if (itemStat.isDirectory()) {
        stack.push(fullPath);
      } else if (itemStat.isFile() && fullPath.endsWith(".js")) {
        files.push(fullPath);
      }
    }
  }

  return files;
};

const jsFiles = roots.flatMap(collectJsFiles);

if (jsFiles.length === 0) {
  console.log("No JS files found to lint.");
  process.exit(0);
}

let hasError = false;

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    hasError = true;
    console.error(`Syntax error in ${path.relative(projectRoot, file)}:`);
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    if (result.stdout) {
      console.error(result.stdout.trim());
    }
  }
}

if (hasError) {
  console.error("Backend lint failed: syntax errors detected.");
  process.exit(1);
}

console.log(`Backend lint passed (${jsFiles.length} files checked).`);
