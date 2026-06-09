import { describe, expect, it } from 'vitest'

import type { ImportData } from '@/card/card-types'
import { normalizeImportMetadata } from '@/card/import-metadata-normalizer'

function createBaseImportData(): ImportData {
  return {
    customFieldDefinitions: {
      professions: ['\u5b88\u591c\u4eba'],
      domains: ['\u706b\u7130'],
      variants: ['\u795e\u5668'],
      variantTypes: {
        ['\u795e\u5668']: {
          description: '\u4fdd\u7559\u5df2\u6709\u63cf\u8ff0',
          subclasses: ['\u53e4\u4ee3'],
          levelRange: [1, 2],
        },
        ['\u9057\u7269']: {
          subclasses: ['\u6536\u85cf'],
          levelRange: [3, 5],
        },
      },
    },
    profession: [
      {
        id: 'profession-1',
        ['\u540d\u79f0']: '\u591c\u884c\u8005',
        ['\u7b80\u4ecb']: '\u6d4b\u8bd5\u804c\u4e1a',
        ['\u9886\u57df1']: '\u706b\u7130',
        ['\u9886\u57df2']: '\u6697\u5f71',
        ['\u8d77\u59cb\u751f\u547d']: 6,
        ['\u8d77\u59cb\u95ea\u907f']: 1,
        ['\u8d77\u59cb\u7269\u54c1']: '\u6d4b\u8bd5\u7269\u54c1',
        ['\u5e0c\u671b\u7279\u6027']: '\u5e0c\u671b\u7279\u6027',
        ['\u804c\u4e1a\u7279\u6027']: '\u804c\u4e1a\u7279\u6027',
      },
    ],
    subclass: [
      {
        id: 'subclass-1',
        ['\u540d\u79f0']: '\u591c\u5f71',
        ['\u63cf\u8ff0']: '\u6d4b\u8bd5\u5b50\u804c\u4e1a',
        ['\u4e3b\u804c']: '\u79d8\u672f\u5e08',
        ['\u5b50\u804c\u4e1a']: '\u5f71\u5203',
        ['\u7b49\u7ea7']: '\u57fa\u77f3',
        ['\u65bd\u6cd5']: '\u654f\u6377',
      },
    ],
    ancestry: [
      {
        id: 'ancestry-1',
        ['\u540d\u79f0']: '\u6708\u88d4\u5929\u8d4b',
        ['\u79cd\u65cf']: '\u6708\u88d4',
        ['\u7b80\u4ecb']: '\u6d4b\u8bd5\u79cd\u65cf',
        ['\u6548\u679c']: '\u6548\u679c',
        ['\u7c7b\u522b']: 1,
      },
    ],
    community: [
      {
        id: 'community-1',
        ['\u540d\u79f0']: '\u6d41\u4ea1\u8005',
        ['\u7279\u6027']: '\u7279\u6027',
        ['\u7b80\u4ecb']: '\u7b80\u4ecb',
        ['\u63cf\u8ff0']: '\u63cf\u8ff0',
      },
    ],
    domain: [
      {
        id: 'domain-1',
        ['\u540d\u79f0']: '\u98ce\u66b4\u51b2\u51fb',
        ['\u9886\u57df']: '\u98ce\u66b4',
        ['\u63cf\u8ff0']: '\u63cf\u8ff0',
        ['\u7b49\u7ea7']: 1,
        ['\u5c5e\u6027']: '\u654f\u6377',
        ['\u56de\u60f3']: 0,
      },
    ],
    variant: [
      {
        id: 'variant-1',
        ['\u540d\u79f0']: '\u53e4\u4ee3\u795e\u5668',
        ['\u7c7b\u578b']: '\u795e\u5668',
        ['\u5b50\u7c7b\u522b']: '\u8fdc\u53e4',
        ['\u7b49\u7ea7']: 4,
        ['\u6548\u679c']: '\u6548\u679c',
      },
      {
        id: 'variant-2',
        ['\u540d\u79f0']: '\u795d\u5723\u5723\u5668',
        ['\u7c7b\u578b']: '\u5723\u5668',
        ['\u5b50\u7c7b\u522b']: '\u795d\u5723',
        ['\u7b49\u7ea7']: 2,
        ['\u6548\u679c']: '\u6548\u679c',
      },
    ],
  }
}

describe('normalizeImportMetadata', () => {
  it('derives batch metadata from cards and reports missing local declarations', () => {
    const result = normalizeImportMetadata(createBaseImportData())

    expect(result.customFieldDefinitions).toEqual({
      professions: ['\u5b88\u591c\u4eba', '\u591c\u884c\u8005', '\u79d8\u672f\u5e08'],
      ancestries: ['\u6708\u88d4'],
      communities: ['\u6d41\u4ea1\u8005'],
      domains: ['\u706b\u7130', '\u6697\u5f71', '\u98ce\u66b4'],
      variants: ['\u795e\u5668', '\u5723\u5668'],
    })
    expect(result.variantTypes).toEqual({
      ['\u795e\u5668']: {
        description: '\u4fdd\u7559\u5df2\u6709\u63cf\u8ff0',
        subclasses: ['\u53e4\u4ee3', '\u8fdc\u53e4'],
        levelRange: [1, 4],
      },
      ['\u9057\u7269']: {
        subclasses: ['\u6536\u85cf'],
        levelRange: [3, 5],
      },
      ['\u5723\u5668']: {
        subclasses: ['\u795d\u5723'],
        levelRange: [2, 2],
      },
    })
    expect(result.warnings).toHaveLength(3)
    expect(result.warnings[0]).toContain('\u4e3b\u804c')
    expect(result.warnings[1]).toContain('\u53d8\u4f53\u7c7b\u578b')
    expect(result.warnings[2]).toContain('\u81ea\u52a8\u8865\u9f50')
  })

  it('suppresses warnings for definitions already provided by enabled batches', () => {
    const importData: ImportData = {
      customFieldDefinitions: {
        professions: ['\u5b88\u591c\u4eba'],
        domains: ['\u706b\u7130'],
      },
      profession: [
        {
          id: 'profession-1',
          ['\u540d\u79f0']: '\u591c\u884c\u8005',
          ['\u7b80\u4ecb']: '\u6d4b\u8bd5\u804c\u4e1a',
          ['\u9886\u57df1']: '\u706b\u7130',
          ['\u9886\u57df2']: '\u6697\u5f71',
          ['\u8d77\u59cb\u751f\u547d']: 6,
          ['\u8d77\u59cb\u95ea\u907f']: 1,
          ['\u8d77\u59cb\u7269\u54c1']: '\u6d4b\u8bd5\u7269\u54c1',
          ['\u5e0c\u671b\u7279\u6027']: '\u5e0c\u671b\u7279\u6027',
          ['\u804c\u4e1a\u7279\u6027']: '\u804c\u4e1a\u7279\u6027',
        },
      ],
      subclass: [
        {
          id: 'subclass-1',
          ['\u540d\u79f0']: '\u591c\u5f71',
          ['\u63cf\u8ff0']: '\u6d4b\u8bd5\u5b50\u804c\u4e1a',
          ['\u4e3b\u804c']: '\u79d8\u672f\u5e08',
          ['\u5b50\u804c\u4e1a']: '\u5f71\u5203',
          ['\u7b49\u7ea7']: '\u57fa\u77f3',
          ['\u65bd\u6cd5']: '\u654f\u6377',
        },
      ],
    }

    const result = normalizeImportMetadata(importData, {
      existingCustomFieldDefinitions: {
        professions: ['\u79d8\u672f\u5e08'],
        domains: ['\u6697\u5f71'],
      },
    })

    expect(result.customFieldDefinitions.professions).toEqual([
      '\u5b88\u591c\u4eba',
      '\u591c\u884c\u8005',
      '\u79d8\u672f\u5e08',
    ])
    expect(result.customFieldDefinitions.domains).toEqual(['\u706b\u7130', '\u6697\u5f71'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('\u804c\u4e1a')
    expect(result.warnings[0]).toContain('\u591c\u884c\u8005')
  })
})
