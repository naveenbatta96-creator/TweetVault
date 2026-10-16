import React from 'react'
import { FileText, X } from 'lucide-react'

export default function StoryDocViewer({ story, onClose }) {
  if (!story) return null

  // Calculate words and read time
  const plainText = story.content ? story.content.replace(/<[^>]+>/g, ' ') : ''
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
  const readTime = story.read_time || `${Math.max(1, Math.ceil(words / 200))} min read`
  const isHtml = /<[a-z][\s\S]*>/i.test(story.content || '')

  const formattedDate = story.created_at
    ? new Date(story.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="docx-viewer-overlay" onClick={onClose}>
      <div className="docx-doc-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Doc Navigation Bar with ONLY Title and Cancel button */}
        <header className="docx-doc-header">
          <div className="docx-doc-header-title">
            <span className="docx-doc-icon-pill">
              <FileText size={16} />
            </span>
            <span className="docx-doc-header-name">
              {story.title || 'Untitled Document'}
            </span>
            <span className="docx-doc-meta-pill">{readTime}</span>
            <span className="docx-doc-meta-pill">{words} words</span>
          </div>

          <button
            type="button"
            className="docx-doc-cancel-btn"
            onClick={onClose}
            title="Cancel / Close (Esc)"
          >
            <X size={18} />
            <span>Cancel</span>
          </button>
        </header>

        {/* Scrollable Document Canvas (Like Google Docs / Word Page) */}
        <div className="docx-doc-scroll-viewport">
          <article className="docx-doc-paper-sheet">
            {/* Optional Cover Media */}
            {story.media_url && (
              <div className="docx-doc-cover">
                <img
                  src={story.media_url}
                  alt={story.title || 'Document cover'}
                  className="docx-doc-cover-img"
                />
              </div>
            )}

            {/* Document Header */}
            <div className="docx-doc-meta-bar">
              <div className="docx-doc-author-lockup">
                <img
                  src={
                    story.author_avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                  }
                  alt={story.author_name}
                  className="docx-doc-avatar"
                />
                <div>
                  <div className="docx-doc-author-name">{story.author_name}</div>
                  <div className="docx-doc-author-handle">
                    {story.author_handle} {formattedDate && `• ${formattedDate}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <h1 className="docx-doc-main-title">{story.title || 'Untitled Document'}</h1>

            {/* Document Prose Content */}
            <div className="docx-doc-prose-body">
              {isHtml ? (
                <div
                  className="docx-rendered-html"
                  dangerouslySetInnerHTML={{ __html: story.content }}
                />
              ) : (
                <div className="docx-rendered-plaintext">
                  {story.content.split(/\r?\n\r?\n/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Document Tags */}
            {story.tags && story.tags.length > 0 && (
              <div className="docx-doc-tags-row">
                {story.tags.map((tag, idx) => (
                  <span key={idx} className="tile-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Document End / Cancel Button */}
            <div className="docx-doc-end-row">
              <button
                type="button"
                className="docx-doc-bottom-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
