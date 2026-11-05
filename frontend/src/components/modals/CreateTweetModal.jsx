import React, { useState, useRef } from 'react'
import { X, Loader2, ImagePlus, Trash2, Sparkles, AlertCircle } from 'lucide-react'
import { uploadMedia } from '../../api/media'
import { fetchTweetByUrl } from '../../api/tweets'
import {
  isGifUrl,
  isImageUrl,
  isVideoUrl,
  resolveMediaUrl,
  handleMediaError,
} from '../../utils/media'

export default function CreateTweetModal({
  isOpen,
  onClose,
  editingPost = null,
  postForm,
  setPostForm,
  folders = [],
  onSavePost,
}) {
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isFetchingTweet, setIsFetchingTweet] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const imageInputRef = useRef(null)
  const tweetTextareaRef = useRef(null)

  if (!isOpen) return null

  // Extract hashtags dynamically from text box
  const detectedTags = Array.from(
    new Set(
      ((postForm?.content || '').match(/#[a-zA-Z0-9_\p{L}]+/gu) || [])
        .map((t) => t.replace('#', '').trim())
        .filter(Boolean)
    )
  )

  // Detect if user has a twitter or x.com link in text
  const detectedUrlMatch = (postForm?.content || '').match(
    /https?:\/\/(?:twitter\.com|x\.com)\/[^\s]+/
  )
  const detectedUrl = detectedUrlMatch ? detectedUrlMatch[0] : null

  const handleFetchTweet = async (targetUrl) => {
    const urlToFetch = targetUrl || detectedUrl
    if (!urlToFetch) return
    setIsFetchingTweet(true)
    setFetchError(null)
    try {
      const res = await fetchTweetByUrl(urlToFetch)
      if (res.success && res.tweet) {
        const tw = res.tweet
        setPostForm((prev) => ({
          ...prev,
          title: tw.title,
          content: tw.content,
          author_name: tw.author_name,
          author_handle: tw.author_handle,
          author_avatar: tw.author_avatar,
          media_url: tw.media_url,
          original_url: tw.original_url,
          likes_count: tw.likes_count,
          retweets_count: tw.retweets_count,
          tags: (tw.tags || []).join(', '),
        }))
      }
    } catch (err) {
      console.error(err)
      setFetchError(err.message || 'Could not fetch tweet details')
    } finally {
      setIsFetchingTweet(false)
    }
  }

  const uploadImageFile = async (file) => {
    if (!file) return
    const isImg = file.type.startsWith('image/') || isImageUrl(file.name)
    const isVid = file.type.startsWith('video/')
    const isGif = file.type === 'image/gif' || file.name?.toLowerCase().endsWith('.gif')
    if (!isImg && !isVid && !isGif) return
    setIsUploadingImage(true)
    try {
      const data = await uploadMedia(file)
      if (data?.local_url) {
        setPostForm((prev) => ({ ...prev, media_url: data.local_url }))
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleTextareaPaste = (e) => {
    const pastedText = e.clipboardData?.getData('text')
    if (pastedText && /https?:\/\/(?:twitter\.com|x\.com)\/[^\s]+/.test(pastedText)) {
      // Auto-trigger fetch if user pasted just a tweet URL into an empty box
      if (!postForm?.content?.trim()) {
        setTimeout(() => {
          handleFetchTweet(pastedText.trim())
        }, 50)
      }
    }

    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          uploadImageFile(file)
          e.preventDefault()
          return
        }
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog create-tweet-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header create-tweet-header">
          <div className="flex items-center gap-2">
            <h3 className="modal-title">
              {editingPost ? 'Edit tweet' : 'Archive tweet'}
            </h3>
            {isFetchingTweet && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--md-sys-color-primary, #a8c7fa)',
                }}
              >
                <Loader2 size={13} className="spin" />
                <span>Ingesting from X...</span>
              </span>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSavePost}>
          <div className="modal-body create-tweet-body">
            {/* Optional Folder assignment */}
            {folders.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <select
                  className="form-input"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                  value={postForm.folder_id || ''}
                  onChange={(e) =>
                    setPostForm({ ...postForm, folder_id: e.target.value })
                  }
                >
                  <option value="">Folder: None (Root Vault)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      Folder: {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1-Click Tweet URL Ingest Banner */}
            {detectedUrl && !isFetchingTweet && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  borderRadius: '10px',
                  background: 'rgba(168, 199, 250, 0.1)',
                  border: '1px solid rgba(168, 199, 250, 0.25)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#a8c7fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} />
                  <span>X / Twitter URL detected</span>
                </div>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'var(--md-sys-color-primary, #a8c7fa)',
                    color: '#042b59',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleFetchTweet(detectedUrl)}
                >
                  <span>Fetch text & media</span>
                </button>
              </div>
            )}

            {fetchError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#f28b82',
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                <AlertCircle size={14} />
                <span>{fetchError}</span>
              </div>
            )}

            {/* Author info pill if available */}
            {postForm.author_handle && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                {postForm.author_avatar ? (
                  <img
                    src={postForm.author_avatar}
                    alt=""
                    style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                  />
                ) : null}
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  {postForm.author_name}
                </span>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>
                  {postForm.author_handle}
                </span>
                {postForm.likes_count > 0 && (
                  <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: 'auto' }}>
                    ❤️ {postForm.likes_count.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* 1. TOP BOX: insert text or paste text */}
            <div className="create-tweet-box">
              <textarea
                ref={tweetTextareaRef}
                className="create-tweet-textarea"
                placeholder="Paste tweet text or tweet link (e.g. https://x.com/user/status/123)..."
                value={postForm.content || ''}
                onChange={(e) =>
                  setPostForm({ ...postForm, content: e.target.value })
                }
                onPaste={handleTextareaPaste}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    onSavePost(e)
                  }
                }}
                autoFocus
              />
              {/* Real-time Tag Detector */}
              {detectedTags.length > 0 && (
                <div className="create-tweet-tags-bar">
                  <span className="create-tweet-tags-label">Tags:</span>
                  <div className="create-tweet-tag-chips">
                    {detectedTags.map((tag, idx) => (
                      <span key={idx} className="create-tweet-tag-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. BOTTOM BOX: add image or drop image */}
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*,video/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.avif,.heic,.heif,.bmp,.svg,.ico,.tiff,.tif,.mp4,.webm,.mov"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadImageFile(file)
                e.target.value = ''
              }}
            />

            <div
              className={`create-image-card ${isDraggingImage ? 'dragging' : ''} ${postForm.media_url ? 'has-image' : ''}`}
              onClick={() => {
                if (!postForm.media_url && !isUploadingImage) {
                  imageInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingImage(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setIsDraggingImage(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDraggingImage(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDraggingImage(false)
                const file = e.dataTransfer?.files?.[0]
                if (file) {
                  uploadImageFile(file)
                }
              }}
            >
              {isUploadingImage ? (
                <div className="create-image-placeholder uploading">
                  <Loader2 size={30} className="spin text-sky-400" />
                  <span className="create-image-text">Uploading media...</span>
                </div>
              ) : postForm.media_url ? (
                <div
                  className="create-image-preview-wrapper"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const previewUrl = postForm.media_url.startsWith('[')
                      ? (() => {
                          try {
                            return JSON.parse(postForm.media_url)[0]
                          } catch {
                            return postForm.media_url
                          }
                        })()
                      : postForm.media_url.split(',')[0].trim()
                    const isVid = isVideoUrl(previewUrl)
                    const resolved = resolveMediaUrl(previewUrl)
                    return (
                      <>
                        {isVid ? (
                          <video
                            src={resolved}
                            className="create-image-preview"
                            muted
                            autoPlay
                            loop
                            onError={(e) => handleMediaError(e, previewUrl)}
                          />
                        ) : (
                          <img
                            src={resolved}
                            alt="Attached media"
                            className="create-image-preview"
                            onError={(e) => handleMediaError(e, previewUrl)}
                          />
                        )}
                        {isGifUrl(previewUrl) && (
                          <div className="gdrive-card-gif-badge modal-gif-badge">
                            GIF
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="create-image-overlay-actions">
                    <button
                      type="button"
                      className="create-image-change-btn"
                      onClick={() => imageInputRef.current?.click()}
                      title="Change image"
                    >
                      <ImagePlus size={15} />
                      <span>Change</span>
                    </button>
                    <button
                      type="button"
                      className="create-image-remove-btn"
                      onClick={() =>
                        setPostForm({ ...postForm, media_url: '' })
                      }
                      title="Remove image"
                    >
                      <Trash2 size={15} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="create-image-placeholder">
                  <div className="create-image-icon-box">
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 48 48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: '#38bdf8' }}
                    >
                      <rect
                        x="6"
                        y="8"
                        width="30"
                        height="28"
                        rx="6"
                        strokeDasharray="3 3"
                      />
                      <circle cx="16" cy="18" r="3" />
                      <path d="M10 30l7-7 5 5 6-7 8 9" />
                      <path d="M38 32v10M33 37h10" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <span className="create-image-text">
                    add image or drop image
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer create-tweet-footer">
            <span className="create-tweet-hint">
              Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
            </span>
            <div className="create-tweet-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary create-tweet-submit-btn"
                disabled={(!postForm.content?.trim() && !postForm.media_url) || isFetchingTweet}
              >
                {editingPost ? 'Save changes' : 'Archive'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
