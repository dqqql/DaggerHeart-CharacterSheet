import { describe, expect, it } from "vitest";
import { createDefaultSheetData } from "@/lib/default-sheet-data";

describe("default sheet data factory", () => {
  it("creates independent nested state for each character and ruleset", () => {
    const first = createDefaultSheetData("daggerheart");
    const second = createDefaultSheetData("rhodes-island");

    expect(first.ruleSetId).toBe("daggerheart");
    expect(second.ruleSetId).toBe("rhodes-island");
    expect(first.cards).not.toBe(second.cards);
    expect(first.cards[0]).not.toBe(second.cards[0]);
    expect(first.inventory).not.toBe(second.inventory);
    expect(first.checkedUpgrades).not.toBe(second.checkedUpgrades);
    expect(first.pageVisibility).not.toBe(second.pageVisibility);
    expect(first.notebook).not.toBe(second.notebook);
    expect(first.rulesetAutomationVersions).not.toBe(
      second.rulesetAutomationVersions,
    );

    first.inventory[0] = "changed";
    expect(second.inventory[0]).toBe("");
  });
});
