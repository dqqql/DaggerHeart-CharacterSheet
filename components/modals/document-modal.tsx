'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { XCircle, Download, BookOpen, FileJson, List } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  userGuideContent: string
  aiGuideContent: string
  exampleJsonContent: string
}

// 从React节点中提取纯文本
const extractText = (children: any): string => {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map(child => {
      if (typeof child === 'string') return child
      if (child?.props?.children) return extractText(child.props.children)
      return ''
    }).join('')
  }
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

// 生成标题锚点ID的函数
const generateHeadingId = (text: string): string => {
  // 先移除Markdown格式标记
  const cleanText = text
    .replace(/\*\*/g, '') // 移除粗体标记
    .replace(/\*/g, '')   // 移除斜体标记
    .replace(/^#+\s+/, '') // 移除标题标记
    
  return cleanText
    .toLowerCase()
    .replace(/[：——]/g, '') // 移除中文特殊标记
    .replace(/\s+/g, '-')    // 空格替换为连字符
    .replace(/[^\w\u4e00-\u9fff-]/g, '') // 保留中文、英文、数字和连字符
    .replace(/^-+|-+$/g, '') // 移除首尾连字符
}

// 提取目录结构的函数
const extractTOC = (content: string) => {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const toc: Array<{ level: number; text: string; id: string }> = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = generateHeadingId(text)
    toc.push({ level, text, id })
  }

  return toc
}

export function DocumentModal({ isOpen, onClose, userGuideContent, aiGuideContent, exampleJsonContent }: DocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'user-guide' | 'ai-guide' | 'example'>('user-guide')
  const [showTOC, setShowTOC] = useState(false)

  if (!isOpen) return null

  const downloadFile = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const tabs = [
    {
      id: 'user-guide' as const,
      title: '📖 用户指南',
      icon: BookOpen,
      content: userGuideContent,
      downloadName: '用户指南.md',
      type: 'text/markdown'
    },
    {
      id: 'ai-guide' as const,
      title: '🤖 AI创作指南', 
      icon: BookOpen,
      content: aiGuideContent,
      downloadName: 'AI-卡包创作指南.md',
      type: 'text/markdown'
    },
    {
      id: 'example' as const,
      title: '📦 示例卡牌包',
      icon: FileJson,
      content: exampleJsonContent,
      downloadName: '神州战役卡牌包.json',
      type: 'application/json'
    }
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab)
  const currentTOC = activeTab !== 'example' ? extractTOC(activeTabData?.content || '') : []

  // 跳转到指定标题的函数
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            卡牌包制作指南
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.title}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 工具栏 */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              {activeTabData?.title}
            </div>
            <div className="flex gap-2">
              {/* 目录按钮 - 只在markdown标签页显示 */}
              {activeTab !== 'example' && currentTOC.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTOC(!showTOC)}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  {showTOC ? '隐藏目录' : '显示目录'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => activeTabData && downloadFile(
                  activeTabData.content, 
                  activeTabData.downloadName,
                  activeTabData.type
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                下载文档
              </Button>
            </div>
          </div>

          {/* 文档内容 */}
          <div className="flex-1 overflow-hidden flex">
            {/* 目录侧边栏 */}
            {showTOC && activeTab !== 'example' && currentTOC.length > 0 && (
              <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">目录</h3>
                  <nav className="space-y-1">
                    {currentTOC.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-200 transition-colors ${
                          item.level === 1 ? 'font-semibold text-gray-900' :
                          item.level === 2 ? 'font-medium text-gray-700 pl-4' :
                          'text-gray-600 pl-6'
                        }`}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            )}
            
            {/* 主内容区 */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'example' ? (
                // JSON 内容使用代码块展示
                <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                  <code>{activeTabData?.content}</code>
                </pre>
              ) : (
                // Markdown 内容使用 ReactMarkdown 渲染
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // 自定义样式，为标题添加锚点ID
                      h1: ({children}) => {
                        const text = extractText(children)
                        const id = generateHeadingId(text)
                        return (
                          <h1 id={id} className="text-3xl font-bold mb-8 mt-12 text-gray-900 pb-4 border-b-2 border-gray-300 scroll-mt-6">
                            {children}
                          </h1>
                        )
                      },
                      h2: ({children}) => {
                        const text = extractText(children)
                        const id = generateHeadingId(text)
                        return (
                          <h2 id={id} className="text-2xl font-bold mb-6 mt-10 text-gray-900 bg-blue-50 px-4 py-3 rounded-md border-l-4 border-blue-500 border-b-2 border-b-blue-200 shadow-sm scroll-mt-6">
                            {children}
                          </h2>
                        )
                      },
                      h3: ({children}) => {
                        const text = extractText(children)
                        const id = generateHeadingId(text)
                        return (
                          <h3 id={id} className="text-xl font-semibold mb-4 mt-8 text-gray-800 bg-gray-50 px-3 py-2 rounded border-l-4 border-gray-400 scroll-mt-6">
                            {children}
                          </h3>
                        )
                      },
                      h4: ({children}) => {
                        const text = extractText(children)
                        const id = generateHeadingId(text)
                        return (
                          <h4 id={id} className="text-lg font-medium mb-3 mt-6 text-gray-700 bg-gray-100 px-2 py-1.5 rounded border-l-2 border-gray-400 scroll-mt-6">
                            {children}
                          </h4>
                        )
                      },
                      h5: ({children}) => {
                        const text = extractText(children)
                        const id = generateHeadingId(text)
                        return (
                          <h5 id={id} className="text-base font-medium mb-2 mt-4 text-gray-600 pl-3 border-l-2 border-gray-200 scroll-mt-6">
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            {children}
                          </h5>
                        )
                      },
                      p: ({children}) => <p className="mb-3 text-gray-600 leading-relaxed">{children}</p>,
                      code: ({children, className}) => {
                        const isBlock = className?.includes('language-')
                        if (isBlock) {
                          return <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code className={className}>{children}</code></pre>
                        }
                        return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                      },
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4 italic">{children}</blockquote>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                      table: ({children}) => <div className="overflow-x-auto mb-4"><table className="min-w-full border border-gray-300">{children}</table></div>,
                      th: ({children}) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-medium text-left">{children}</th>,
                      td: ({children}) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
                      // 自定义链接处理，修复内部锚点跳转
                      a: ({href, children}) => {
                        // 检查是否为内部锚点链接
                        if (href?.startsWith('#')) {
                          const handleClick = (e: React.MouseEvent) => {
                            e.preventDefault() // 阻止默认行为，防止URL改变
                            // 解码URL编码的ID
                            const encodedId = href.substring(1)
                            const decodedId = decodeURIComponent(encodedId)
                            
                            // 直接查找元素
                            const element = document.getElementById(decodedId)
                            
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            } else {
                              console.warn('Element not found for ID:', decodedId)
                            }
                          }
                          return (
                            <a 
                              href={href} 
                              onClick={handleClick}
                              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              {children}
                            </a>
                          )
                        }
                        // 外部链接保持默认行为
                        return (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {children}
                          </a>
                        )
                      },
                    }}
                  >
                    {activeTabData?.content || ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              💡 提示：下载文档到本地可以离线查看，示例卡牌包可以直接导入测试
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/dqqql/DaggerHeart-CharacterSheet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                📖 GitHub 项目
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
