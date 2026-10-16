import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  PASTE_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
} from 'lexical'
import { ImageNode, $createImageNode } from './ImageNode'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  FileText,
  Download,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react'

// Lexical Theme Mapping to clean Docx CSS classes
const docxTheme = {
  ltr: 'docx-ltr',
  rtl: 'docx-rtl',
  paragraph: 'docx-paragraph',
  quote: 'docx-quote',
  heading: {
    h1: 'docx-h1',
    h2: 'docx-h2',
    h3: 'docx-h3',
  },
  list: {
    nested: {
      listitem: 'docx-nested-listitem',
    },
    ol: 'docx-ol',
    ul: 'docx-ul',
    listitem: 'docx-li',
  },
  text: {
    bold: 'docx-bold',
    italic: 'docx-italic',
    underline: 'docx-underline',
    strikethrough: 'docx-strikethrough',
    code: 'docx-code',
  },
}

// Initial Content Loader
function InitialContentPlugin({ content }) {
  const [editor] = useLexicalComposerContext()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    if (!content || !content.trim()) return

    editor.update(() => {
      const root = $getRoot()
      root.clear()

      // If content has HTML tags, parse as HTML nodes
      if (/<[a-z][\s\S]*>/i.test(content)) {
        try {
          const parser = new DOMParser()
          const dom = parser.parseFromString(content, 'text/html')
          const nodes = $generateNodesFromDOM(editor, dom)
          root.append(...nodes)
          return
        } catch (err) {
          console.warn('Failed to parse HTML into Lexical, falling back to text:', err)
        }
      }

      // Plain text or Markdown fallback: create paragraphs
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        const p = $createParagraphNode()
        if (line) {
          p.append($createTextNode(line))
        }
        root.append(p)
      }
    })
  }, [editor, content])

  return null
}

// Paste Handler Plugin for Direct Images, Screenshots & Mixed OneNote / Web pastes
function PasteMediaPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        const apiBase =
          typeof window !== 'undefined' && window.location.protocol === 'file:'
            ? 'http://localhost:8085/api'
            : '/api'

        // 1. Check for directly pasted files (Snipping tool, screenshot, or copied image file)
        const files = Array.from(clipboardData.files || []).filter((file) =>
          file.type.startsWith('image/')
        )

        if (files.length > 0) {
          event.preventDefault()
          files.forEach((file) => {
            const formData = new FormData()
            formData.append('file', file)

            fetch(`${apiBase}/media/upload`, {
              method: 'POST',
              body: formData,
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.local_url) {
                  editor.update(() => {
                    const fullUrl =
                      typeof window !== 'undefined' && window.location.protocol === 'file:'
                        ? `http://localhost:8085${data.local_url}`
                        : data.local_url
                    const imageNode = $createImageNode({
                      src: fullUrl,
                      altText: file.name || 'Pasted image',
                    })
                    $insertNodes([imageNode])
                  })
                }
              })
              .catch(() => {
                const reader = new FileReader()
                reader.onload = () => {
                  editor.update(() => {
                    const imageNode = $createImageNode({
                      src: reader.result,
                      altText: file.name || 'Pasted image',
                    })
                    $insertNodes([imageNode])
                  })
                }
                reader.readAsDataURL(file)
              })
          })
          return true
        }

        // 2. Check for clipboard item image (when user right-clicks copy image without HTML file)
        const items = Array.from(clipboardData.items || [])
        const imageItem = items.find((item) => item.type.startsWith('image/'))
        const html = clipboardData.getData('text/html')

        if (imageItem && (!html || !html.trim())) {
          const blob = imageItem.getAsFile()
          if (blob) {
            event.preventDefault()
            const formData = new FormData()
            formData.append('file', blob, 'clipboard_image.png')

            fetch(`${apiBase}/media/upload`, {
              method: 'POST',
              body: formData,
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.local_url) {
                  editor.update(() => {
                    const fullUrl =
                      typeof window !== 'undefined' && window.location.protocol === 'file:'
                        ? `http://localhost:8085${data.local_url}`
                        : data.local_url
                    const imageNode = $createImageNode({
                      src: fullUrl,
                      altText: 'Pasted image',
                    })
                    $insertNodes([imageNode])
                  })
                }
              })
              .catch(() => {
                const reader = new FileReader()
                reader.onload = () => {
                  editor.update(() => {
                    const imageNode = $createImageNode({
                      src: reader.result,
                      altText: 'Pasted image',
                    })
                    $insertNodes([imageNode])
                  })
                }
                reader.readAsDataURL(blob)
              })
            return true
          }
        }

        // 3. For mixed text + images (OneNote, Web articles):
        // Returning false allows Lexical's HTML parser to run.
        // ImageNode converts <img> tags, and ImageComponent automatically downloads
        // external links and OneNote file:/// paths to local storage!
        return false
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}

// Docx Rich Text Toolbar
function DocxToolbar({ onExportDoc, wordCount, readTime }) {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [blockType, setBlockType] = useState('paragraph')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const fileInputRef = useRef(null)

  const handleInsertImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const apiBase =
      typeof window !== 'undefined' && window.location.protocol === 'file:'
        ? 'http://localhost:8085/api'
        : '/api'

    fetch(`${apiBase}/media/upload`, {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.local_url) {
          editor.update(() => {
            const fullUrl =
              typeof window !== 'undefined' && window.location.protocol === 'file:'
                ? `http://localhost:8085${data.local_url}`
                : data.local_url
            const imageNode = $createImageNode({
              src: fullUrl,
              altText: file.name,
            })
            $insertNodes([imageNode])
          })
        }
      })
      .catch((err) => {
        console.warn('Upload error, fallback to FileReader:', err)
        const reader = new FileReader()
        reader.onload = () => {
          editor.update(() => {
            const imageNode = $createImageNode({
              src: reader.result,
              altText: file.name,
            })
            $insertNodes([imageNode])
          })
        }
        reader.readAsDataURL(file)
      })

    e.target.value = ''
  }

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsCode(selection.hasFormat('code'))

      // Detect Block Type
      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)
      if (elementDOM !== null) {
        const type = element.getType()
        if (type === 'heading') {
          const tag = element.getTag()
          setBlockType(tag)
        } else if (type === 'quote') {
          setBlockType('quote')
        } else if (type === 'list') {
          const listType = element.getListType()
          setBlockType(listType === 'bullet' ? 'bullet' : 'number')
        } else {
          setBlockType('paragraph')
        }
      }
    }
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload)
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload)
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
    setBlockType('paragraph')
  }

  const formatHeading = (headingSize) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      })
      setBlockType(headingSize)
    } else {
      formatParagraph()
    }
  }

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode())
        }
      })
      setBlockType('quote')
    } else {
      formatParagraph()
    }
  }

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
      setBlockType('bullet')
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      setBlockType('paragraph')
    }
  }

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
      setBlockType('number')
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      setBlockType('paragraph')
    }
  }

  return (
    <div className="docx-toolbar">
      {/* Undo / Redo */}
      <div className="docx-toolbar-group">
        <button
          type="button"
          className="docx-tool-btn"
          disabled={!canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          className="docx-tool-btn"
          disabled={!canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={14} />
        </button>
      </div>

      <div className="docx-toolbar-divider" />

      {/* Block Formats */}
      <div className="docx-toolbar-group">
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'h1' ? 'active' : ''}`}
          onClick={() => formatHeading('h1')}
          title="Heading 1 (Main Title)"
        >
          <Heading1 size={15} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'h2' ? 'active' : ''}`}
          onClick={() => formatHeading('h2')}
          title="Heading 2 (Section)"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'h3' ? 'active' : ''}`}
          onClick={() => formatHeading('h3')}
          title="Heading 3 (Subsection)"
        >
          <Heading3 size={15} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'quote' ? 'active' : ''}`}
          onClick={formatQuote}
          title="Quote / Callout"
        >
          <Quote size={14} />
        </button>
      </div>

      <div className="docx-toolbar-divider" />

      {/* Text Style */}
      <div className="docx-toolbar-group">
        <button
          type="button"
          className={`docx-tool-btn ${isBold ? 'active' : ''}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${isItalic ? 'active' : ''}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${isUnderline ? 'active' : ''}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          title="Underline (Ctrl+U)"
        >
          <Underline size={14} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${isStrikethrough ? 'active' : ''}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${isCode ? 'active' : ''}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
          title="Code snippet"
        >
          <Code size={14} />
        </button>
      </div>

      <div className="docx-toolbar-divider" />

      {/* Lists */}
      <div className="docx-toolbar-group">
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'bullet' ? 'active' : ''}`}
          onClick={formatBulletList}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={`docx-tool-btn ${blockType === 'number' ? 'active' : ''}`}
          onClick={formatNumberedList}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
      </div>

      <div className="docx-toolbar-divider" />

      {/* Alignment */}
      <div className="docx-toolbar-group">
        <button
          type="button"
          className="docx-tool-btn"
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className="docx-tool-btn"
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className="docx-tool-btn"
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          className="docx-tool-btn"
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
          title="Justify"
        >
          <AlignJustify size={14} />
        </button>
      </div>

      <div className="docx-toolbar-divider" />

      {/* Insert Image */}
      <div className="docx-toolbar-group">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="docx-tool-btn"
          onClick={handleInsertImageClick}
          title="Insert Picture (from computer)"
        >
          <ImageIcon size={14} />
          <span style={{ fontSize: '0.78rem', marginLeft: '2px' }}>Image</span>
        </button>
      </div>

      <div className="docx-toolbar-spacer" />

      {/* Stats & Docx Export */}
      <div className="docx-toolbar-right">
        <span className="docx-stat-pill" title="Estimated reading time">
          <BookOpen size={12} />
          {readTime}
        </span>
        <span className="docx-stat-pill" title="Word count">
          {wordCount} words
        </span>
        {onExportDoc && (
          <button
            type="button"
            className="docx-tool-btn-export"
            onClick={onExportDoc}
            title="Download as Word Document (.doc)"
          >
            <Download size={13} />
            <span>Export .doc</span>
          </button>
        )}
      </div>
    </div>
  )
}

// StoryDocEditor Component
export default function StoryDocEditor({
  initialContent = '',
  storyTitle = '',
  onChange,
  minHeight = '320px',
}) {
  const [wordCount, setWordCount] = useState(0)
  const [readTime, setReadTime] = useState('1 min read')
  const [htmlContent, setHtmlContent] = useState('')

  const initialConfig = {
    namespace: 'TweetVaultDocxEditor',
    theme: docxTheme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ImageNode],
    onError(error) {
      console.error('Lexical Editor Error:', error)
    },
  }

  const handleEditorChange = (editorState, editor) => {
    editorState.read(() => {
      const root = $getRoot()
      const plainText = root.getTextContent()
      const html = $generateHtmlFromNodes(editor, null)
      setHtmlContent(html)

      // Calculate words and read time
      const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
      setWordCount(words)
      const minutes = Math.max(1, Math.ceil(words / 200))
      const timeStr = `${minutes} min read`
      setReadTime(timeStr)

      if (onChange) {
        onChange({
          html,
          plainText,
          wordCount: words,
          readTime: timeStr,
        })
      }
    })
  }

  // Export to Microsoft Word .doc file
  const handleExportDoc = () => {
    const title = storyTitle || 'Untitled Story'
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { font-size: 26pt; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
          h2 { font-size: 18pt; color: #1e293b; margin-top: 24px; margin-bottom: 12px; }
          h3 { font-size: 14pt; color: #334155; margin-top: 18px; margin-bottom: 8px; }
          blockquote { border-left: 4px solid #3b82f6; padding-left: 14px; margin-left: 0; color: #475569; font-style: italic; }
          p { margin-bottom: 12px; }
          code { font-family: Consolas, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10pt; }
          ul, ol { margin-left: 20px; margin-bottom: 12px; }
          li { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${htmlContent || '<p>No content</p>'}
      </body>
      </html>
    `
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9_-]/gi, '_')}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="docx-editor-container">
      <LexicalComposer initialConfig={initialConfig}>
        <DocxToolbar
          onExportDoc={handleExportDoc}
          wordCount={wordCount}
          readTime={readTime}
        />

        <div className="docx-paper-wrapper">
          <div className="docx-paper-sheet" style={{ minHeight }}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="docx-content-editable" />
              }
              placeholder={
                <div className="docx-editor-placeholder">
                  Start drafting your story, article, or document here...
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ListPlugin />
            <InitialContentPlugin content={initialContent} />
            <PasteMediaPlugin />
            <OnChangePlugin onChange={handleEditorChange} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  )
}
