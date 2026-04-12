#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const rootDir = path.resolve(__dirname, "..")
const outDir = path.join(rootDir, "out")
const nextCli = path.join(
  rootDir,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function removeRootTextFiles() {
  if (!fs.existsSync(outDir)) {
    return
  }

  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".txt")) {
      fs.rmSync(path.join(outDir, entry.name), { force: true })
    }
  }
}

function buildStatic({ local = false } = {}) {
  run(process.execPath, [path.join(__dirname, "optimize-images.js")])
  run(process.execPath, [nextCli, "build"], local ? { env: { LOCAL_BUILD: "true" } } : {})
  removeRootTextFiles()
  run(process.execPath, [path.join(__dirname, "extract-css.js")])
}

if (require.main === module) {
  buildStatic({ local: process.argv.includes("--local") })
}

module.exports = {
  buildStatic,
  outDir,
  rootDir,
}
