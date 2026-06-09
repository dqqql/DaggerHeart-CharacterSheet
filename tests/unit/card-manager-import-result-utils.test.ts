import { describe, expect, it } from 'vitest'

import { DhcbImportError } from '@/card/utils/dhcb-importer'
import {
  buildFailedDhcbResult,
  getImportIssueSections,
  getImportStatusErrorMessage,
} from '@/app/card-manager/import-result-utils'

describe('card manager import result helpers', () => {
  it('keeps dhcb validation errors, warnings, and image errors separated', () => {
    const result = buildFailedDhcbResult(
      'broken.dhcb',
      new DhcbImportError('导入已取消', {
        validationErrors: ['duplicate id'],
        warnings: ['normalized warning'],
        imageErrors: ['orphan image'],
      })
    )

    expect(result).toMatchObject({
      success: false,
      imported: 0,
      fileName: 'broken.dhcb',
      errors: ['duplicate id'],
      warnings: ['normalized warning'],
      imageErrors: ['orphan image'],
    })
  })

  it('falls back to the error message when a dhcb failure has no validation errors', () => {
    const result = buildFailedDhcbResult(
      'broken.dhcb',
      new DhcbImportError('图片导入失败，已回滚本次卡包导入。', {
        imageErrors: ['indexeddb unavailable'],
      })
    )

    expect(result.errors).toEqual(['图片导入失败，已回滚本次卡包导入。'])
    expect(result.imageErrors).toEqual(['indexeddb unavailable'])
  })

  it('treats fatal image errors as error sections in failed results', () => {
    const sections = getImportIssueSections({
      success: false,
      imported: 0,
      errors: ['missing required field'],
      warnings: ['normalized warning'],
      imageErrors: ['orphan image'],
    })

    expect(sections).toEqual([
      {
        title: '提示信息：',
        items: ['normalized warning'],
        tone: 'warning',
      },
      {
        title: '图片处理问题：',
        items: ['orphan image'],
        tone: 'error',
      },
      {
        title: '错误信息：',
        items: ['missing required field'],
        tone: 'error',
      },
    ])
  })

  it('keeps non-fatal image issues as warnings for successful imports', () => {
    const sections = getImportIssueSections({
      success: true,
      imported: 1,
      errors: [],
      imageErrors: ['skipped unreadable image'],
    })

    expect(sections).toEqual([
      {
        title: '图片处理问题：',
        items: ['skipped unreadable image'],
        tone: 'warning',
      },
    ])
  })

  it('uses single-file wording when only one imported file fails', () => {
    expect(
      getImportStatusErrorMessage([
        {
          success: false,
          imported: 0,
          errors: ['broken json'],
          fileName: 'single.dhcb',
        },
      ])
    ).toBe('导入失败，请检查下方结果')
  })

  it('uses batch wording when one of multiple files fails', () => {
    expect(
      getImportStatusErrorMessage([
        {
          success: true,
          imported: 1,
          errors: [],
          fileName: 'ok.json',
        },
        {
          success: false,
          imported: 0,
          errors: ['broken json'],
          fileName: 'broken.dhcb',
        },
      ])
    ).toBe('部分文件导入失败，请检查下方结果')
  })
})
