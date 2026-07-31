import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const currentDir = path.dirname(fileURLToPath(import.meta.url))

function readWorkspaceFile(relativePath: string) {
  return fs.readFileSync(path.resolve(currentDir, "..", "..", relativePath), "utf8")
}

describe("card system initialization scope", () => {
  it("keeps the global app layout free of the card system initializer", () => {
    const layoutSource = readWorkspaceFile("app/layout.tsx")

    expect(layoutSource).not.toContain("CardSystemInitializer")
  })

  it("mounts the card system initializer from the home route instead", () => {
    const homePageSource = readWorkspaceFile("app/page.tsx")

    expect(homePageSource).toContain(
      'import { CardSystemInitializer } from "@/components/card-system-initializer"',
    )
    expect(homePageSource).toContain("<CardSystemInitializer />")
  })

  it("keeps card-manager's explicit initialization path intact", () => {
    const cardManagerSource = readWorkspaceFile("app/card-manager/page.tsx")

    expect(cardManagerSource).toContain("await store.initializeSystem()")
  })

  it("lets the store deduplicate initialization instead of scheduling route timers", () => {
    const initializerSource = readWorkspaceFile("components/card-system-initializer.tsx")
    const storeActionsSource = readWorkspaceFile("card/stores/store-actions.ts")

    expect(initializerSource).not.toContain("setTimeout")
    expect(initializerSource).not.toContain("state => state.loading")
    expect(storeActionsSource).toContain("if (initializationPromise)")
    expect(storeActionsSource).toContain("return initializationPromise")

    const publicApiSource = readWorkspaceFile("card/index-unified.ts")
    expect(publicApiSource.match(/async function ensureCardSystemInitialized/g)).toHaveLength(1)
    expect(publicApiSource.match(/await store\.initializeSystem\(\)/g)).toHaveLength(1)
  })
})
