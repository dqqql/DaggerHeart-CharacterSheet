import JSZip from 'jszip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockReplaceAllEditorImages, mockToast } = vi.hoisted(() => ({
  mockReplaceAllEditorImages: vi.fn(),
  mockToast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/app/card-editor/utils/image-db-helpers', () => ({
  replaceAllEditorImages: mockReplaceAllEditorImages,
}))

import { importCardPackage } from '@/app/card-editor/utils/import-export'
import { importCardPackageWithImages } from '@/app/card-editor/utils/zip-import'

function mockFilePicker(file: File) {
  const originalCreateElement = document.createElement.bind(document)
  const input = {
    type: '',
    accept: '',
    onchange: null as ((event: Event) => void | Promise<void>) | null,
    click: vi.fn(function (this: { onchange: ((event: Event) => void | Promise<void>) | null }) {
      queueMicrotask(() => {
        void this.onchange?.({
          target: { files: [file] }
        } as unknown as Event)
      })
    }),
  } as unknown as HTMLInputElement

  const createElementSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return input
      }

      return originalCreateElement(tagName)
    }) as typeof document.createElement)

  return () => createElementSpy.mockRestore()
}

function createImportData() {
  return {
    name: 'Imported Package',
    author: 'Tester',
    description: 'test package',
    customFieldDefinitions: {},
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
  }
}

async function createZipImportFile(cardsData: unknown, includeImage = true): Promise<File> {
  const zip = new JSZip()
  zip.file('cards.json', typeof cardsData === 'string' ? cardsData : JSON.stringify(cardsData))

  if (includeImage) {
    zip.file('images/card-1.png', new Uint8Array([1, 2, 3]))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'package.dhcb', { type: 'application/zip' })
}

describe('card package import image replacement flow', () => {
  beforeEach(() => {
    mockReplaceAllEditorImages.mockReset()
    mockReplaceAllEditorImages.mockResolvedValue(undefined)
    mockToast.info.mockReset()
    mockToast.success.mockReset()
    mockToast.error.mockReset()
  })

  it('replaces editor images only after a JSON import parses successfully', async () => {
    const restoreCreateElement = mockFilePicker(
      new File([JSON.stringify(createImportData())], 'package.json', {
        type: 'application/json',
      }),
    )

    try {
      const result = await importCardPackage()

      expect(result?.name).toBe('Imported Package')
      expect(mockReplaceAllEditorImages).toHaveBeenCalledTimes(1)
      expect(mockReplaceAllEditorImages).toHaveBeenCalledWith([])
    } finally {
      restoreCreateElement()
    }
  })

  it('keeps existing images untouched when JSON import parsing fails', async () => {
    const restoreCreateElement = mockFilePicker(
      new File(['{invalid-json'], 'broken.json', {
        type: 'application/json',
      }),
    )

    try {
      const result = await importCardPackage()

      expect(result).toBeNull()
      expect(mockReplaceAllEditorImages).not.toHaveBeenCalled()
    } finally {
      restoreCreateElement()
    }
  })

  it('stages ZIP images and replaces them only after the full package is ready', async () => {
    const file = await createZipImportFile({
      ...createImportData(),
      profession: [{ id: 'card-1', name: 'Card 1' }],
    })

    const result = await importCardPackageWithImages(file)

    expect(result.profession?.[0]?.hasLocalImage).toBe(true)
    expect(mockReplaceAllEditorImages).toHaveBeenCalledTimes(1)
    expect(mockReplaceAllEditorImages.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ key: 'card-1' }),
    ])
  })

  it('keeps existing images untouched when ZIP import fails before commit', async () => {
    const file = await createZipImportFile('{invalid-json')

    await expect(importCardPackageWithImages(file)).rejects.toThrow()
    expect(mockReplaceAllEditorImages).not.toHaveBeenCalled()
  })
})
