import { describe, expect, it } from "vitest"
import pack from "../../public/card-packs/希望与恐惧SRD车卡器卡包v1.0.json"
import builtin from "../../data/cards/builtin-base.json"
import { useUnifiedCardStore } from "../../card/stores/unified-card-store"
import { getAllWeapons } from "../../data/list/all-weapons"
import { getDaggerheartArmorCatalog, isHopeFearPackActive } from "../../data/list/hope-fear-equipment"
import type { BatchInfo } from "../../card/stores/store-types"

describe("希望与恐惧卡包", () => {
  it("imports as a valid package without colliding with built-in card IDs", async () => {
    const store = useUnifiedCardStore.getState()
    const validation = store._validateImportData(pack, "import_relaxed")
    expect(validation.errors).toEqual([])
    expect(validation.isValid).toBe(true)
    const converted = await store._convertImportData(pack)
    expect(converted.success).toBe(true)
    expect(converted.cards).toHaveLength(72)
    const builtInIds = new Set(Object.values(builtin).filter(Array.isArray).flatMap(cards => cards.map(card => card.id)))
    expect(converted.cards.every(card => !builtInIds.has(card.id))).toBe(true)
  })

  it("shows additional equipment only while the imported package is enabled", () => {
    const batch = { name: "希望与恐惧", version: "V20261026", disabled: false, isSystemBatch: false } as BatchInfo
    const batches = new Map([["hope-fear", batch]])
    expect(getAllWeapons(false).some(weapon => weapon.名称 === "武士刀")).toBe(false)
    expect(getDaggerheartArmorCatalog(false).some(armor => armor.名称 === "法师长袍")).toBe(false)
    expect(isHopeFearPackActive(batches)).toBe(true)
    expect(getAllWeapons(isHopeFearPackActive(batches)).some(weapon => weapon.名称 === "武士刀")).toBe(true)
    expect(getDaggerheartArmorCatalog(isHopeFearPackActive(batches)).some(armor => armor.名称 === "法师长袍")).toBe(true)
    batch.disabled = true
    expect(isHopeFearPackActive(batches)).toBe(false)
    batches.clear()
    expect(isHopeFearPackActive(batches)).toBe(false)
  })
})
