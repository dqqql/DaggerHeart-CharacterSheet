#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { buildStatic, outDir, rootDir } = require("./build-static")

const distDir = path.join(rootDir, "dist")
const packageName = "DaggerHeart-CharacterSheet-offline"
const packageDir = path.join(distDir, packageName)
const zipPath = path.join(distDir, `${packageName}.zip`)

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
  fs.mkdirSync(dirPath, { recursive: true })
}

function writeReadme() {
  const readme = [
    "DaggerHeart Character Sheet Offline Package",
    "",
    "How to use:",
    "1. Double-click OPEN.bat on Windows, or open START-HERE.html in a browser.",
    "2. Use a modern browser such as Edge or Chrome.",
    "3. Your character data stays in this browser on this computer.",
    "4. Use the built-in import/export features if you want backups or transfers.",
    "",
    "Notes:",
    "- This is an offline static build.",
    "- No installation or server is required.",
  ].join("\n")

  fs.writeFileSync(path.join(packageDir, "README.txt"), readme, "utf8")
}

function writeLauncher() {
  const launcher = [
    "@echo off",
    "cd /d \"%~dp0\"",
    "start \"\" \"START-HERE.html\"",
  ].join("\r\n")

  fs.writeFileSync(path.join(packageDir, "OPEN.bat"), launcher, "ascii")
}

function copyPackageFiles() {
  if (!fs.existsSync(path.join(outDir, "index.html"))) {
    throw new Error("Expected out/index.html to exist after the local build.")
  }

  ensureCleanDir(packageDir)
  fs.cpSync(outDir, packageDir, { recursive: true, force: true })
  fs.copyFileSync(
    path.join(packageDir, "index.html"),
    path.join(packageDir, "START-HERE.html"),
  )

  const licensePath = path.join(rootDir, "LICENSE")
  if (fs.existsSync(licensePath)) {
    fs.copyFileSync(licensePath, path.join(packageDir, "LICENSE"))
  }

  writeReadme()
  writeLauncher()
}

function createZipArchive() {
  fs.mkdirSync(distDir, { recursive: true })
  fs.rmSync(zipPath, { force: true })

  if (process.platform === "win32") {
    const command = `Compress-Archive -Path "${packageDir}\\*" -DestinationPath "${zipPath}" -Force`
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: rootDir,
      stdio: "inherit",
    })

    if (result.status !== 0) {
      throw new Error("Failed to create the offline zip archive.")
    }

    return
  }

  const result = spawnSync("zip", ["-qr", zipPath, packageName], {
    cwd: distDir,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error("Failed to create the offline zip archive.")
  }
}

function main() {
  buildStatic({ local: true })
  copyPackageFiles()
  createZipArchive()

  console.log(`Offline package folder: ${packageDir}`)
  console.log(`Offline package zip: ${zipPath}`)
}

main()
