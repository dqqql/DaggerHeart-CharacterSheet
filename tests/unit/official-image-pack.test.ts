import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import {
  detectOfficialImagePackZipKind,
  OFFICIAL_IMAGE_PACK_MATCH_BY,
  OFFICIAL_IMAGE_PACK_TYPE,
  findOfficialImagePackManifestPath,
  resolveOfficialImagePackImageRoot,
  validateOfficialImagePackManifest,
} from "@/lib/official-image-pack"

describe("official image pack manifest validation", () => {
  it("accepts a valid manifest", () => {
    const manifest = validateOfficialImagePackManifest({
      type: OFFICIAL_IMAGE_PACK_TYPE,
      packId: "builtin-official-images",
      version: "V20251114",
      target: "builtin-base",
      matchBy: OFFICIAL_IMAGE_PACK_MATCH_BY,
      imagePattern: "images/{cardId}.webp",
    })

    expect(manifest.packId).toBe("builtin-official-images")
    expect(manifest.target).toBe("builtin-base")
  })

  it("rejects an unexpected package type", () => {
    expect(() =>
      validateOfficialImagePackManifest({
        type: "custom-card-pack",
        packId: "builtin-official-images",
        version: "V20251114",
        target: "builtin-base",
        matchBy: OFFICIAL_IMAGE_PACK_MATCH_BY,
        imagePattern: "images/{cardId}.webp",
      }),
    ).toThrow("manifest.json.type")
  })

  it("rejects an unexpected match mode", () => {
    expect(() =>
      validateOfficialImagePackManifest({
        type: OFFICIAL_IMAGE_PACK_TYPE,
        packId: "builtin-official-images",
        version: "V20251114",
        target: "builtin-base",
        matchBy: "name",
        imagePattern: "images/{cardId}.webp",
      }),
    ).toThrow("manifest.json.matchBy")
  })

  it("finds manifest.json inside a top-level folder", async () => {
    const zip = new JSZip()
    zip.file("official-image-pack/manifest.json", "{}")
    zip.file("official-image-pack/images/example.webp", "fake")

    expect(findOfficialImagePackManifestPath(zip)).toBe(
      "official-image-pack/manifest.json",
    )
  })

  it("resolves the image root relative to the manifest location", () => {
    const imageRoot = resolveOfficialImagePackImageRoot(
      "official-image-pack/manifest.json",
      {
        type: OFFICIAL_IMAGE_PACK_TYPE,
        packId: "builtin-official-images",
        version: "V20251114",
        target: "builtin-base",
        matchBy: OFFICIAL_IMAGE_PACK_MATCH_BY,
        imagePattern: "images/{cardId}.webp",
      },
    )

    expect(imageRoot).toBe("official-image-pack/images/")
  })

  it("detects the offline app package as a wrong zip type", () => {
    const zip = new JSZip()
    zip.file("index.html", "<html></html>")
    zip.file("START-HERE.html", "<html></html>")
    zip.file("_next/static/chunks/app/page.js", "console.log('app')")

    expect(detectOfficialImagePackZipKind(zip)).toBe("offline-app-package")
  })
})
