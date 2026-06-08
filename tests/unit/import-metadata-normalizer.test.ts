import { describe, expect, it } from 'vitest'

import type { ImportData } from '@/card/card-types'
import { normalizeImportMetadata } from '@/card/import-metadata-normalizer'

describe('normalizeImportMetadata', () => {
  it('derives batch metadata from cards and merges it with existing definitions', () => {
    const importData: ImportData = {
      customFieldDefinitions: {
        professions: ['守夜人'],
        domains: ['火焰'],
        variants: ['神器'],
        variantTypes: {
          神器: {
            description: '保留已有描述',
            subclasses: ['古代'],
            levelRange: [1, 2],
          },
          遗物: {
            subclasses: ['馆藏'],
            levelRange: [3, 5],
          },
        },
      },
      profession: [
        {
          id: 'profession-1',
          名称: '夜行者',
          简介: '测试职业',
          领域1: '火焰',
          领域2: '暗影',
          起始生命: 6,
          起始闪避: 1,
          起始物品: '测试物品',
          希望特性: '希望特性',
          职业特性: '职业特性',
        },
      ],
      subclass: [
        {
          id: 'subclass-1',
          名称: '夜影',
          描述: '测试子职业',
          主职: '秘术师',
          子职业: '影刃',
          等级: '基石',
          施法: '敏捷',
        },
      ],
      ancestry: [
        {
          id: 'ancestry-1',
          名称: '月裔天赋',
          种族: '月裔',
          简介: '测试种族',
          效果: '效果',
          类别: 1,
        },
      ],
      community: [
        {
          id: 'community-1',
          名称: '流亡者',
          特性: '特性',
          简介: '简介',
          描述: '描述',
        },
      ],
      domain: [
        {
          id: 'domain-1',
          名称: '风暴冲击',
          领域: '风暴',
          描述: '描述',
          等级: 1,
          属性: '敏捷',
          回想: 0,
        },
      ],
      variant: [
        {
          id: 'variant-1',
          名称: '古代神器',
          类型: '神器',
          子类别: '远古',
          等级: 4,
          效果: '效果',
        },
        {
          id: 'variant-2',
          名称: '祝圣圣器',
          类型: '圣器',
          子类别: '祝圣',
          等级: 2,
          效果: '效果',
        },
      ],
    }

    const result = normalizeImportMetadata(importData)

    expect(result.customFieldDefinitions).toEqual({
      professions: ['守夜人', '夜行者', '秘术师'],
      ancestries: ['月裔'],
      communities: ['流亡者'],
      domains: ['火焰', '暗影', '风暴'],
      variants: ['神器', '圣器'],
    })
    expect(result.variantTypes).toEqual({
      神器: {
        description: '保留已有描述',
        subclasses: ['古代', '远古'],
        levelRange: [1, 4],
      },
      遗物: {
        subclasses: ['馆藏'],
        levelRange: [3, 5],
      },
      圣器: {
        subclasses: ['祝圣'],
        levelRange: [2, 2],
      },
    })
    expect(result.warnings).toEqual([
      '有子职业引用了未预先声明的主职：秘术师。系统已按卡牌内容继续导入，并补齐这些主职定义。',
      '发现未预先定义的变体类型：圣器。系统已根据对应卡牌内容自动建立这些类型。',
      '以下定义未在导入文件中预先声明，系统已根据卡牌内容自动补齐：职业：夜行者；领域：暗影、风暴；种族：月裔；社群：流亡者。',
    ])
  })
})
