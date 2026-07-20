"use client"

import type React from "react"
import { useState } from "react"
import TextareaAutosize from "react-textarea-autosize"

interface ContentEditableFieldProps {
  name: string
  value: string
  placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  maxLength?: number
  className?: string
  maxLines?: number
}

export function ContentEditableField({
  name,
  value,
  placeholder = "",
  onChange,
  maxLength,
  className = "",
  maxLines = 2
}: ContentEditableFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  
  // 根据可见行数智能分割文本（用于打印）
  const splitValueToLines = (value: string): string[] => {
    if (!value) return Array(maxLines).fill("")
    
    // 如果包含换行符，按换行符分割
    if (value.includes('\n')) {
      return Array.from({ length: maxLines }, (_, index) => value.split('\n')[index] || "")
    }
    
    // 如果长度超过29字符，逐行智能分割
    const maxCharsPerLine = 29;
    const lines: string[] = []
    let remaining = value.trim()

    while (lines.length < maxLines) {
      if (lines.length === maxLines - 1 || remaining.length <= maxCharsPerLine) {
        lines.push(remaining)
        remaining = ""
        break
      }

      let splitIndex = maxCharsPerLine
      for (let i = maxCharsPerLine; i >= Math.max(0, maxCharsPerLine - 5); i--) {
        const char = remaining[i]
        if (char === ' ' || ['，', '。', '：', ';', ',', ':'].includes(char)) {
          splitIndex = i + 1
          break
        }
      }

      lines.push(remaining.substring(0, splitIndex).trim())
      remaining = remaining.substring(splitIndex).trim()
    }

    return [...lines, ...Array(Math.max(0, maxLines - lines.length)).fill("")]
  }

  const printLines = splitValueToLines(value)
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    
    // 限制字符数量（如果设置了）
    if (maxLength && newValue.length > maxLength) {
      return
    }
    
    // 限制行数
    const lines = newValue.split('\n')
    if (maxLines && lines.length > maxLines) {
      return
    }
    
    // 转换为标准的 input change 事件
    const syntheticEvent = {
      target: {
        name,
        value: newValue
      }
    } as React.ChangeEvent<HTMLInputElement>
    
    onChange(syntheticEvent)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 限制换行
    if (e.key === 'Enter') {
      const currentLines = value.split('\n').length
      if (maxLines && currentLines >= maxLines) {
        e.preventDefault()
        return
      }
    }
  }
  
  // 记事本样式  
  const notebookStyles = {
    backgroundImage: `repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 24px,
      #9ca3af 24px,
      #9ca3af 25px
    )`,
    lineHeight: '25px',
    padding: '0 3px',
    paddingTop: '0',
    resize: 'none' as const,
    overflow: 'hidden' as const,
    wordWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    backgroundColor: 'transparent',
    backgroundSize: '100% 25px',
    backgroundPosition: '0 0',
    border: 'none',
    outline: 'none'
  }
  
  // 屏幕和打印样式
  const printStyles = `
    /* 屏幕模式：重置 textarea 样式 */
    .notebook-textarea {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      appearance: none !important;
    }
    
    /* 焦点时的蓝色环形边框 */
    .notebook-textarea:focus,
    textarea.notebook-textarea:focus {
      border: 0 !important;
      outline: 0 !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5) !important;
    }
    
    @media print {
      .notebook-textarea {
        display: none !important;
      }
      
      .notebook-print-div {
        display: block !important;
      }
      
      /* 强制重置打印模式的input样式 */
      .notebook-print-div input {
        border: none !important;
        border-bottom: 1px solid #9ca3af !important; /* 只保留底部边框 */
        border-top: none !important;
        border-left: none !important;  
        border-right: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        background: transparent !important;
        padding: 0 3px !important;
        margin: 0 !important;
        line-height: 25px !important;
        height: 25px !important;
      }
    }
    
    @media screen {
      .notebook-print-div {
        display: none !important;
      }
    }
  `
  
  const combinedClassName = `
    ${className}
    cursor-text
    hover:bg-gray-50
    transition-colors
    text-sm
    block
    w-full
    ${!value && !isFocused ? 'text-gray-400' : 'text-gray-800'}
    notebook-textarea
    resize-none
    border-none
    outline-none
  `.trim()
  
  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* 屏幕显示：textarea */}
      <TextareaAutosize
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        minRows={maxLines}
        maxRows={maxLines}
        className={combinedClassName}
        style={notebookStyles}
      />
      
      {/* 打印显示：按 maxLines 生成对应行数 */}
      <div className="notebook-print-div space-y-1">
        {printLines.map((line, index) => (
          <input
            key={`${name}-print-line-${index}`}
            type="text"
            value={line}
            readOnly
            className="w-full border-b border-gray-400 text-sm bg-transparent outline-none block print-empty-hide"
          />
        ))}
      </div>
      
      {isFocused && maxLength && (
        <div className="absolute -bottom-5 right-0 text-xs text-gray-500">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  )
}
