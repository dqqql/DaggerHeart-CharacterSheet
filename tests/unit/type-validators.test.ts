import { describe, expect, it } from "vitest"

import {
  partitionImportValidationErrors,
  validateProfessionCard,
  validateVariantCard,
  type ValidationContext,
  type ValidationError,
} from "@/card/type-validators"

const context: ValidationContext = {
  customFields: {
    professions: ["零闪避职业"],
    domains: ["领域一", "领域二"],
    ancestries: [],
    communities: [],
    variants: [],
  },
  variantTypes: {},
}

describe("validateProfessionCard", () => {
  it("allows profession starting evasion to be zero", () => {
    const result = validateProfessionCard(
      {
        id: "zero-evasion-profession",
        名称: "零闪避职业",
        简介: "测试职业",
        领域1: "领域一",
        领域2: "领域二",
        起始生命: 6,
        起始闪避: 0,
        起始物品: "测试物品",
        希望特性: "测试希望特性",
        职业特性: "测试职业特性",
      },
      0,
      undefined,
      context
    )

    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ path: "profession[0].起始闪避" })
    )
    expect(result.isValid).toBe(true)
  })
})

describe("partitionImportValidationErrors", () => {
  it("downgrades reference integrity issues with concrete values into warnings", () => {
    const issues: ValidationError[] = [
      {
        path: "profession[0].领域1",
        message: "领域1字段必须是有效的领域名称。有效选项: 守护, 奥术 (或用户自定义)",
        value: "失落领域",
      },
      {
        path: "variant[0].等级",
        message: "等级字段必须在范围 1-3 内",
        value: 5,
      },
    ]

    const result = partitionImportValidationErrors(issues)

    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toEqual(issues)
    expect(result.isValid).toBe(true)
  })

  it("keeps missing required values and structural problems as fatal errors", () => {
    const issues: ValidationError[] = [
      {
        path: "profession[0].领域1",
        message: "领域1字段必须是有效的领域名称。有效选项: 守护, 奥术 (或用户自定义)",
        value: undefined,
      },
      {
        path: "variant[0].等级",
        message: "等级字段必须是非负数字",
        value: -1,
      },
    ]

    const result = partitionImportValidationErrors(issues)

    expect(result.errors).toEqual(issues)
    expect(result.warnings).toHaveLength(0)
    expect(result.isValid).toBe(false)
  })
})

describe("validateVariantCard", () => {
  it("accepts package-declared variants even when unrelated variantTypes already exist in context", () => {
    const result = validateVariantCard(
      {
        id: "enemy-variant-1",
        ["\u540d\u79f0"]: "灰帽",
        ["\u7c7b\u578b"]: "敌人",
        ["\u6548\u679c"]: "测试效果",
      },
      0,
      undefined,
      {
        customFields: {
          professions: [],
          domains: [],
          ancestries: [],
          communities: [],
          variants: ["敌人"],
        },
        variantTypes: {
          ["\u91ce\u517d\u5f62\u6001"]: {
            subclasses: [],
            levelRange: [1, 4],
          },
        },
      }
    )

    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ path: "variant[0].类型" })
    )
    expect(result.isValid).toBe(true)
  })
})
