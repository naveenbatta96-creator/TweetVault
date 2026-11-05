import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  ExternalLink,
  BookOpen,
  Calendar,
  Clock,
  MessageSquare,
  Edit2,
  Save,
} from 'lucide-react'
import Carousel from './Carousel'
import { updatePost } from '../api/posts'
import { parseMediaList, isVideoUrl } from '../utils/media'

export default function StoryDocViewer({ story, onClose, onUpdateStory }) {
  if (!story) return null

  // State
  const [title, setTitle] = useState(story.title || 'Untitled Thread')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [comment, setComment] = useState(story.comment || '')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Media
  const mediaList = parseMediaList(story.media_url)
  const images = mediaList.filter((m) => !isVideoUrl(m))
  const videos = mediaList.filter((m) => isVideoUrl(m))

  // Derived statistics
  const plainText = (story.content || '').replace(/<[^>]+>/g, ' ')
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
  const readTime =
    story.read_time || `${Math.max(1, Math.ceil(words / 200))} min read`

  const formattedDate = story.created_at
    ? new Date(story.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent'

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Save updated title
  const handleSaveTitle = async () => {
    setIsEditingTitle(false)
    if (title === story.title || !title.trim()) return
    try {
      const updated = await updatePost(story.id, {
        ...story,
        title: title.trim(),
      })
      onUpdateStory?.(updated)
    } catch (e) {
      console.error('Failed to update title:', e)
    }
  }

  // Save personal note
  const handleSaveNote = async () => {
    setIsSavingNote(true)
    try {
      const updated = await updatePost(story.id, {
        ...story,
        comment: comment.trim(),
      })
      onUpdateStory?.(updated)
      setNoteSavedFeedback(true)
      setTimeout(() => setNoteSavedFeedback(false), 2000)
    } catch (e) {
      console.error('Failed to save note:', e)
    } finally {
      setIsSavingNote(false)
    }
  }

  // Copy full thread text
  const handleCopy = () => {
    navigator.clipboard.writeText(`${title}\n\n${plainText.trim()}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Export thread as Markdown
  const handleExportMarkdown = () => {
    const md = `# ${title}\n\n**Author:** ${story.author_name || 'Author'} (${story.author_handle || '@author'})\n**Archived:** ${formattedDate}\n\n---\n\n${plainText.trim()}\n\n${
      comment.trim() ? `\n---\n### Personal Notes\n${comment.trim()}\n` : ''
    }`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'thread').replace(/[^a-z0-9_-]/gi, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="thread-reader-overlay">
      {/* Top Navigation Bar */}
      <header className="thread-reader-topbar">
        <div className="thread-reader-topbar-left">
          <button
            type="button"
            className="thread-reader-back-btn"
            onClick={onClose}
            title="Back to Vault (Esc)"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="thread-reader-badge">
            <BookOpen size={14} />
            <span>Thread Reader</span>
          </div>
        </div>

        <div className="thread-reader-topbar-right">
          <button
            type="button"
            className="thread-reader-btn"
            onClick={handleCopy}
            title="Copy entire thread text"
          >
            {isCopied ? <Check size={14} color="#81c995" /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            className="thread-reader-btn"
            onClick={handleExportMarkdown}
            title="Export as Markdown (.md)"
          >
            <Download size={14} />
            <span>Export .md</span>
          </button>

          {story.original_url && (
            <a
              href={story.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="thread-reader-btn"
              title="Open original thread on X/Twitter"
            >
              <ExternalLink size={14} />
              <span>Original</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="thread-reader-main">
        <article className="thread-reader-article">
          {/* Author & Metadata Row */}
          <div className="thread-reader-meta-row">
            <div className="thread-reader-author-info">
              {story.author_avatar ? (
                <img
                  src={story.author_avatar}
                  alt={story.author_name}
                  className="thread-reader-avatar"
                />
              ) : (
                <div className="thread-reader-avatar-fallback">
                  {(story.author_name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="thread-reader-author-name">
                  {story.author_name || 'Archived Thread'}
                </div>
                <div className="thread-reader-author-handle">
                  {story.author_handle || '@author'}
                </div>
              </div>
            </div>

            <div className="thread-reader-stats">
              <span className="thread-reader-stat-item">
                <Calendar size={13} />
                <span>{formattedDate}</span>
              </span>
              <span className="thread-reader-stat-item">
                <Clock size={13} />
                <span>{readTime}</span>
              </span>
            </div>
          </div>

          {/* Title Header */}
          <div className="thread-reader-title-section">
            {isEditingTitle ? (
              <div className="thread-reader-title-edit-box">
                <input
                  type="text"
                  className="thread-reader-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') setIsEditingTitle(false)
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="thread-reader-btn primary"
                  onClick={handleSaveTitle}
                >
                  <Save size={13} />
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <h1
                className="thread-reader-title"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
              >
                <span>{title}</span>
                <Edit2 size={15} className="thread-reader-edit-icon" />
              </h1>
            )}
          </div>

          {/* Tags */}
          {story.tags && story.tags.length > 0 && (
            <div className="thread-reader-tags">
              {story.tags.map((tag, idx) => (
                <span key={idx} className="thread-reader-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Media: Multi-image Carousel or Single Video */}
          {images.length > 0 && (
            <div className="thread-reader-media-block">
              <Carousel
                media={images}
                transitionEffect="tilt"
                aspectRatio="16:9"
                showDots={images.length > 1}
                showArrows={images.length > 1}
                showCounter={images.length > 1}
                allowFullscreen={true}
              />
            </div>
          )}

          {videos.length > 0 && (
            <div className="thread-reader-media-block">
              <video
                src={videos[0]}
                controls
                className="thread-reader-video"
              />
            </div>
          )}

          {/* Thread Body Content */}
          <div
            className="thread-reader-content"
            dangerouslySetInnerHTML={{
              __html:
                story.content && story.content.includes('<p')
                  ? story.content
                  : `<p style="white-space: pre-wrap;">${story.content || 'No content archived.'}</p>`,
            }}
          />

          {/* Personal Notes Card */}
          <div className="thread-reader-notes-card">
            <div className="thread-reader-notes-header">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} color="var(--md-sys-color-primary, #a8c7fa)" />
                <span className="font-semibold text-sm">Personal Notes & Takeaways</span>
              </div>
              <button
                type="button"
                className="thread-reader-btn primary"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                <Save size={13} />
                <span>{noteSavedFeedback ? 'Saved!' : isSavingNote ? 'Saving...' : 'Save Note'}</span>
              </button>
            </div>
            <textarea
              className="thread-reader-notes-textarea"
              placeholder="Jot down personal thoughts, key quotes, or action items from this thread..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </article>
      </main>
    </div>
  )
}
