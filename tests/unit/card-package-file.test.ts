import { describe, expect, it } from "vitest"

import {
  CARD_PACKAGE_IMPORT_ACCEPT,
  getCardPackageDownloadName,
  isCardPackageArchiveFileName,
} from "@/card/utils/card-package-file"

describe("card package file helpers", () => {
  it("recognizes both zip and dhcb archives case-insensitively", () => {
    expect(isCardPackageArchiveFileName("demo.zip")).toBe(true)
    expect(isCardPackageArchiveFileName("demo.dhcb")).toBe(true)
    expect(isCardPackageArchiveFileName("DEMO.ZIP")).toBe(true)
    expect(isCardPackageArchiveFileName("DEMO.DHCB")).toBe(true)
    expect(isCardPackageArchiveFileName("demo.json")).toBe(false)
  })

  it("defaults exported card packages to zip", () => {
    expect(getCardPackageDownloadName("卡包")).toBe("卡包.zip")
  })

  it("preserves an existing supported archive extension", () => {
    expect(getCardPackageDownloadName("卡包.zip")).toBe("卡包.zip")
    expect(getCardPackageDownloadName("卡包.dhcb")).toBe("卡包.dhcb")
  })

  it("exports the shared import accept string", () => {
    expect(CARD_PACKAGE_IMPORT_ACCEPT).toBe(".json,.dhcb,.zip")
  })
})
