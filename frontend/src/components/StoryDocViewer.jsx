import React, { useState } from 'react'
import {
  BookOpen,
  Edit3,
  Download,
  Printer,
  X,
  Type,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Share2,
  Bookmark,
  Heart
} from 'lucide-react'

export default function StoryDocViewer({
  story,
  onClose,
  onEdit,
}) {
  const [fontFamily, setFontFamily] = useState('sans') // 'sans' | 'serif'
  const [fontSizeLevel, setFontSizeLevel] = useState(1) // 0: small, 1: medium, 2: large

  if (!story) return null

  const fontSizes = ['0.95rem', '1.08rem', '1.25rem']
  const currentFontSize = fontSizes[fontSizeLevel]

  // Calculate words and read time
  const plainText = story.content ? story.content.replace(/<[^>]+>/g, ' ') : ''
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
  const readTime = story.read_time || `${Math.max(1, Math.ceil(words / 200))} min read`

  const isHtml = /<[a-z][\s\S]*>/i.test(story.content || '')

  // Export to .doc file
  const handleExportDoc = () => {
    const title = story.title || 'Story'
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { font-size: 26pt; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
          .meta { color: #64748b; font-size: 11pt; margin-bottom: 24px; }
          h2 { font-size: 18pt; color: #1e293b; margin-top: 24px; margin-bottom: 12px; }
          h3 { font-size: 14pt; color: #334155; margin-top: 18px; margin-bottom: 8px; }
          blockquote { border-left: 4px solid #3b82f6; padding-left: 14px; margin-left: 0; color: #475569; font-style: italic; }
          p { margin-bottom: 12px; }
          code { font-family: Consolas, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">By ${story.author_name} (${story.author_handle}) • ${readTime}</div>
        ${story.content || ''}
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="docx-viewer-overlay" onClick={onClose}>
      <div className="docx-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Docx Reader Control Bar */}
        <header className="docx-viewer-header">
          <div className="docx-viewer-header-left">
            <span className="docx-doc-badge">
              <BookOpen size={14} />
              <span>Docx Story Reader</span>
            </span>
            <span className="docx-stat-pill">{words} words</span>
            <span className="docx-stat-pill">{readTime}</span>
          </div>

          <div className="docx-viewer-header-right">
            {/* Font Style Toggle */}
            <div className="docx-control-group">
              <button
                type="button"
                className={`docx-tool-btn ${fontFamily === 'sans' ? 'active' : ''}`}
                onClick={() => setFontFamily('sans')}
                title="Modern Sans-Serif Typography"
              >
                <span>Sans</span>
              </button>
              <button
                type="button"
                className={`docx-tool-btn ${fontFamily === 'serif' ? 'active' : ''}`}
                onClick={() => setFontFamily('serif')}
                title="Editorial Book Serif Typography"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                <span>Serif</span>
              </button>
            </div>

            {/* Font Size Zoom */}
            <div className="docx-control-group">
              <button
                type="button"
                className="docx-tool-btn"
                disabled={fontSizeLevel === 0}
                onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel - 1))}
                title="Decrease Font Size"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                className="docx-tool-btn"
                disabled={fontSizeLevel === 2}
                onClick={() => setFontSizeLevel(Math.min(2, fontSizeLevel + 1))}
                title="Increase Font Size"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Export & Print */}
            <div className="docx-control-group">
              <button
                type="button"
                className="docx-tool-btn"
                onClick={handlePrint}
                title="Print Document"
              >
                <Printer size={14} />
              </button>
              <button
                type="button"
                className="docx-tool-btn-export"
                onClick={handleExportDoc}
                title="Download as Word Document (.doc)"
              >
                <Download size={13} />
                <span>Export .doc</span>
              </button>
            </div>

            {/* Edit & Close */}
            {onEdit && (
              <button
                type="button"
                className="docx-tool-btn"
                style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                onClick={() => {
                  onClose()
                  onEdit(story)
                }}
                title="Edit this story in Docx Editor"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            )}

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close Reader"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Reader Document Paper Body */}
        <div className="docx-viewer-scroll-container">
          <article
            className={`docx-viewer-paper ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
            style={{ fontSize: currentFontSize }}
          >
            {/* Optional Cover Image */}
            {story.media_url && (
              <div className="docx-viewer-cover-wrap">
                <img
                  src={story.media_url}
                  alt={story.title}
                  className="docx-viewer-cover-img"
                />
              </div>
            )}

            {/* Story Meta Header */}
            <div className="docx-viewer-meta-row">
              <div className="docx-author-profile">
                <img
                  src={story.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt={story.author_name}
                  className="docx-author-avatar"
                />
                <div>
                  <div className="docx-author-name">{story.author_name}</div>
                  <div className="docx-author-sub">
                    {story.author_handle} • {readTime}
                  </div>
                </div>
              </div>

              {story.created_at && (
                <div className="docx-story-date">
                  {new Date(story.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              )}
            </div>

            {/* Story Title */}
            <h1 className="docx-viewer-title">{story.title}</h1>

            {/* Story Body Prose */}
            <div className="docx-viewer-prose">
              {isHtml ? (
                <div
                  className="docx-rendered-html"
                  dangerouslySetInnerHTML={{ __html: story.content }}
                />
              ) : (
                <div className="docx-rendered-plaintext">
                  {story.content.split(/\r?\n\r?\n/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Tags & Footer */}
            {story.tags && story.tags.length > 0 && (
              <div className="docx-viewer-tags">
                {story.tags.map((tag, idx) => (
                  <span key={idx} className="tile-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>

        {/* Bottom Footer Actions */}
        <footer className="docx-viewer-footer">
          <div className="docx-viewer-footer-info">
            <span>Reading {story.title}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onEdit && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onClose()
                  onEdit(story)
                }}
              >
                <Edit3 size={15} />
                <span>Edit Story</span>
              </button>
            )}
            <button type="button" className="btn-primary" onClick={onClose}>
              Done Reading
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
