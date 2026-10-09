import { describe, expect, it } from 'vitest'
import daggerheart from '../fixtures/dhol/daggerheart-sheet.json'
import rhodes from '../fixtures/dhol/rhodes-sheet.json'
import { getRuleSetModule } from '@/lib/rulesets/registry'
import { createDefaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'

describe('dhol JSON contract fixtures', () => {
  it.each([daggerheart, rhodes])('exports resources and extension fields for %s', fixture => {
    const ruleSetId = fixture.ruleSetId as SheetData['ruleSetId']
    const source = Object.assign(createDefaultSheetData(ruleSetId), fixture)
    const exported = getRuleSetModule(ruleSetId).prepareForExport(source)
    expect(exported.ruleSetId).toBe(fixture.ruleSetId)
    expect(exported.name).toBe(fixture.name)
    expect(exported.hope).toBe(fixture.hope)
    expect(exported.hp).toEqual(fixture.hp)
    expect(exported.stress).toEqual(fixture.stress)
    expect(exported.armorBoxes).toEqual(fixture.armorBoxes)
    expect(exported.cards).toEqual(fixture.cards)
    expect(exported).toHaveProperty('agility')
    expect(exported).toHaveProperty('primaryWeaponDamage')
  })
})
