import React, { memo, useMemo } from 'react'
import { Video, FileText, MessageSquare, FolderInput, Play } from 'lucide-react'
import {
  getPrimaryMediaUrl,
  isVideoUrl,
  isGifUrl,
  resolveMediaUrl,
  handleMediaError,
} from '../../utils/media'

function PostGridCard({
  post,
  isSelected = false,
  onSelectPost,
  onOpenPost,
  onOpenMovePost,
}) {
  const isStory = post.type === 'story'
  const primaryMedia = useMemo(() => getPrimaryMediaUrl(post.media_url), [post.media_url])
  const isVideo = useMemo(() => isVideoUrl(primaryMedia), [primaryMedia])
  const isGif = useMemo(() => isGifUrl(primaryMedia), [primaryMedia])

  const mediaCount = useMemo(() => {
    if (post.media_url && typeof post.media_url === 'string' && post.media_url.trim().startsWith('[')) {
      try {
        return JSON.parse(post.media_url).length
      } catch {
        return 1
      }
    }
    return primaryMedia ? 1 : 0
  }, [post.media_url, primaryMedia])

  return (
    <div
      className={`gdrive-file-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onOpenPost?.(post)}
    >
      <div
        className="gdrive-card-select-box"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="gdrive-checkbox"
          checked={isSelected}
          onChange={(e) => onSelectPost?.(post.id, e)}
          title={isSelected ? 'Deselect item' : 'Select item'}
        />
      </div>
      <div className="gdrive-card-preview">
        {primaryMedia ? (
          <>
            {isVideo ? (
              <video
                src={resolveMediaUrl(primaryMedia)}
                className="gdrive-card-img"
                muted
                preload="metadata"
                onError={(e) => handleMediaError(e, primaryMedia)}
              />
            ) : (
              <img
                src={resolveMediaUrl(primaryMedia)}
                alt="preview"
                className="gdrive-card-img"
                loading="lazy"
                decoding="async"
                onError={(e) => handleMediaError(e, primaryMedia)}
              />
            )}
            {isVideo && (
              <div className="gdrive-card-video-disc">
                <Play
                  size={14}
                  fill="#ffffff"
                  color="#ffffff"
                  style={{ marginLeft: '2px' }}
                />
              </div>
            )}
            {isGif && (
              <div className="gdrive-card-gif-badge">
                GIF
              </div>
            )}
            {!isVideo && !isGif && mediaCount > 1 && (
              <div className="gdrive-card-carousel-badge">
                {mediaCount} photos
              </div>
            )}
          </>
        ) : (
          <div className="gdrive-card-text-preview">{post.content}</div>
        )}
      </div>
      <div className="gdrive-card-info">
        <span
          className={`gdrive-file-icon ${isVideo ? 'video' : isGif ? 'gif' : isStory ? 'doc' : 'tweet'}`}
        >
          {isVideo ? (
            <Video size={13} />
          ) : isGif ? (
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>GIF</span>
          ) : isStory ? (
            <FileText size={13} />
          ) : (
            <MessageSquare size={13} />
          )}
        </span>
        <div className="gdrive-card-meta">
          <span className="gdrive-card-title">
            {post.title || post.content.substring(0, 50)}
          </span>
          <span className="gdrive-card-sub">{post.type} · Saved in vault</span>
        </div>
        <button
          type="button"
          className="gdrive-action-icon-btn"
          style={{ opacity: 0.8, marginLeft: 'auto' }}
          onClick={(e) => {
            e.stopPropagation()
            onOpenMovePost?.(post, e)
          }}
          title="Move to folder or collection"
        >
          <FolderInput size={15} />
        </button>
      </div>
    </div>
  )
}

export default memo(PostGridCard)

