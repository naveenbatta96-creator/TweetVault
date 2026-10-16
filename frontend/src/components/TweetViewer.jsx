import React from 'react'
import {
  X,
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share2,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react'

// Helper to format text with Twitter style blue hashtags, mentions, and URLs
function formatTwitterText(text) {
  if (!text) return ''
  const parts = text.split(/(\B#\w+|\B@\w+|https?:\/\/[^\s]+)/g)
  return parts.map((part, index) => {
    if (part.startsWith('#') || part.startsWith('@') || part.startsWith('http')) {
      return (
        <span key={index} className="twitter-link-highlight">
          {part}
        </span>
      )
    }
    return part
  })
}

export default function TweetViewer({ tweet, onClose, onLike }) {
  if (!tweet) return null

  const formattedDate = tweet.created_at
    ? new Date(tweet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      new Date(tweet.created_at).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '10:42 PM · Oct 16, 2026'

  return (
    <div className="tweet-viewer-overlay" onClick={onClose}>
      <div className="tweet-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Top Twitter Bar with Close / Cancel button */}
        <div className="tweet-viewer-topbar">
          <div className="tweet-viewer-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d9bf0">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
            </svg>
            <span className="tweet-viewer-title-text">Post</span>
          </div>

          <button
            type="button"
            className="tweet-cancel-btn"
            onClick={onClose}
            title="Cancel / Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tweet Main Content Container */}
        <div className="tweet-viewer-body">
          {/* Author Header */}
          <div className="tweet-author-header">
            <img
              src={
                tweet.author_avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
              }
              alt={tweet.author_name}
              className="tweet-author-avatar"
            />
            <div className="tweet-author-meta">
              <div className="tweet-author-row">
                <span className="tweet-author-name">{tweet.author_name}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d9bf0" className="tweet-verified-badge">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.05 2.148-2.42 2.148-4zm-12.7 4.7l-4.2-4.2 1.4-1.4 2.8 2.8 7.2-7.2 1.4 1.4-8.6 8.6z" />
                </svg>
              </div>
              <span className="tweet-author-handle">{tweet.author_handle}</span>
            </div>

            {tweet.original_url && (
              <a
                href={tweet.original_url}
                target="_blank"
                rel="noreferrer"
                className="tweet-external-link-btn"
                title="View on Twitter/X"
              >
                <ExternalLink size={14} />
                <span>Original</span>
              </a>
            )}
          </div>

          {/* Tweet Text Prose */}
          <div className="tweet-text-content">
            {formatTwitterText(tweet.content)}
          </div>

          {/* Tweet Media Image */}
          {tweet.media_url && (
            <div className="tweet-media-frame">
              <img
                src={tweet.media_url}
                alt="Tweet attachment"
                className="tweet-media-image"
                loading="eager"
              />
            </div>
          )}

          {/* Timestamp and Client */}
          <div className="tweet-timestamp-row">
            <span>{formattedDate}</span>
            <span>·</span>
            <span style={{ color: '#1d9bf0' }}>TweetVault</span>
          </div>

          {/* Engagement Counts Bar */}
          <div className="tweet-stats-bar">
            <span className="tweet-stat-unit">
              <strong>{tweet.retweets_count || 0}</strong>
              <span>Reposts</span>
            </span>
            <span className="tweet-stat-unit">
              <strong>{tweet.likes_count || 0}</strong>
              <span>Likes</span>
            </span>
            <span className="tweet-stat-unit">
              <strong>{tweet.bookmarks_count || 0}</strong>
              <span>Bookmarks</span>
            </span>
          </div>

          {/* Twitter Action Buttons Row */}
          <div className="tweet-action-buttons">
            <button type="button" className="tweet-action-btn reply" title="Reply">
              <MessageCircle size={18} />
            </button>
            <button type="button" className="tweet-action-btn repost" title="Repost">
              <Repeat2 size={18} />
            </button>
            <button
              type="button"
              className={`tweet-action-btn like ${tweet.likes_count > 0 ? 'liked' : ''}`}
              onClick={(e) => onLike && onLike(tweet, e)}
              title="Like"
            >
              <Heart size={18} fill={tweet.likes_count > 0 ? '#f91880' : 'none'} color={tweet.likes_count > 0 ? '#f91880' : 'currentColor'} />
            </button>
            <button type="button" className="tweet-action-btn bookmark" title="Bookmark">
              <Bookmark size={18} />
            </button>
            <button type="button" className="tweet-action-btn share" title="Share">
              <Share2 size={18} />
            </button>
          </div>

          {/* Optional Vault Note */}
          {tweet.comment && (
            <div className="tweet-vault-note">
              <div className="tweet-note-header">
                <MessageSquare size={13} />
                <span>My Vault Note</span>
              </div>
              <p className="tweet-note-text">{tweet.comment}</p>
            </div>
          )}

          {/* Tags */}
          {tweet.tags && tweet.tags.length > 0 && (
            <div className="tweet-tags-row">
              {tweet.tags.map((tag, i) => (
                <span key={i} className="tweet-tag-pill">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer with clean Cancel / Close button */}
        <div className="tweet-viewer-footer">
          <button type="button" className="tweet-bottom-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
