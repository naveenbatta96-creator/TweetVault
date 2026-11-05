import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Search,
  Upload,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  FolderInput,
  Check,
  Loader2,
  Radio,
  Settings,
  Folder,
  Send,
  X,
  Bold,
  Italic,
  Link,
  Hash,
  AtSign,
  AlertTriangle,
  Image as ImageIcon,
  Video as VideoIcon,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Layers,
  Sparkles,
  ImageOff
} from 'lucide-react'

import Carousel from './Carousel'
import ErrorBoundary from './ErrorBoundary'
import { getApiBase } from '../api/client'
import { uploadMedia } from '../api/media'
import {
  parseMediaList,
  isVideoUrl,
  isGifUrl,
  getMediaExtension,
  resolveMediaUrl,
  handleMediaError,
} from '../utils/media'
import { formatTwitterText } from '../utils/format'

export default function TweetViewer({
  tweet,
  onClose,
  onUpdateTweet,
  onDeleteTweet,
  onNavigateToFolder,
  folders = [],
  spaces = [],
  activeSpace,
}) {
  // Media state
  const [mediaItems, setMediaItems] = useState(() => parseMediaList(tweet?.media_url))
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  const currentMediaUrl = mediaItems[activeMediaIndex]
  const currentIsVideo = isVideoUrl(currentMediaUrl)
  const currentIsGif = isGifUrl(currentMediaUrl)
  const isMulti = mediaItems.length > 1

  // Video playback engine
  const videoRef = useRef(null)
  const mediaStageRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [duration, setDuration] = useState('00:00')
  const [volume, setVolume] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)

  // Zoom and Quick Media states
  const [isZoomed, setIsZoomed] = useState(false)
  const [carouselEffect, setCarouselEffect] = useState('tilt')
  const [toastMsg, setToastMsg] = useState('')
  const [isCopyingImage, setIsCopyingImage] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Reset video player and zoom when active media item changes
  useEffect(() => {
    setProgress(0)
    setCurrentTime('00:00')
    setDuration('00:00')
    setIsPlaying(false)
    setVideoError(false)
    setImageLoadError(false)
    setIsZoomed(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }, [activeMediaIndex, tweet.id])

  // Tweet Copy editing state (Screen 07: Inline Text Edit Mode)
  const [isEditingText, setIsEditingText] = useState(false)
  const [tweetContent, setTweetContent] = useState(tweet.content || '')
  const [isSavingText, setIsSavingText] = useState(false)
  const textareaRef = useRef(null)

  // Move to folder dialog state (Screen 09: Move to Folder Directory Dialog)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [folderSearchQuery, setFolderSearchQuery] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState(
    tweet?.folder_id ? String(tweet.folder_id) : ''
  )
  const [isMoving, setIsMoving] = useState(false)

  // Safe Delete confirmation dialog (Screen 10: Delete Confirmation Dialog)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [purgeDiskFiles, setPurgeDiskFiles] = useState(true)

  // Add media state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customMediaUrl, setCustomMediaUrl] = useState('')
  const fileInputRef = useRef(null)

  // Comments / Responses list & input
  const [commentInput, setCommentInput] = useState('')
  const [responsesList, setResponsesList] = useState(() => {
    const list = []
    if (tweet?.comment && tweet.comment.trim()) {
      list.push({
        id: 'initial-note',
        author: 'Author',
        handle: '@author',
        time: 'Saved Note',
        isAuthor: true,
        text: tweet.comment.trim(),
      })
    }
    return list
  })

  useEffect(() => {
    const list = parseMediaList(tweet?.media_url)
    setMediaItems(list)
    setActiveMediaIndex(0)
    setTweetContent(tweet?.content || '')
    setSelectedFolderId(tweet?.folder_id ? String(tweet.folder_id) : '')
    if (tweet?.comment && tweet.comment.trim()) {
      setResponsesList([
        {
          id: 'initial-note',
          author: 'Author',
          handle: '@author',
          time: 'Saved Note',
          isAuthor: true,
          text: tweet.comment.trim(),
        },
      ])
    } else {
      setResponsesList([])
    }
  }, [tweet])

  const apiBase = getApiBase()

  // Toast notification helper
  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }, [])

  // Quick Media Actions: Download current photo or video
  const handleDownloadCurrentMedia = async () => {
    if (!currentMediaUrl) return
    setIsDownloading(true)
    try {
      const res = await fetch(currentMediaUrl)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const ext = getMediaExtension(currentMediaUrl, currentIsVideo ? '.mp4' : (currentIsGif ? '.gif' : '.jpg'))
      const rawName = currentMediaUrl.split('/').pop() || `media_${activeMediaIndex + 1}${ext}`
      const filename = rawName.includes('.') ? rawName : `${rawName}${ext}`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
      showToast(`Downloaded ${filename}`)
    } catch (err) {
      const a = document.createElement('a')
      a.href = currentMediaUrl
      const fallbackExt = getMediaExtension(currentMediaUrl, currentIsVideo ? '.mp4' : (currentIsGif ? '.gif' : '.jpg'))
      a.download = `media_${activeMediaIndex + 1}${fallbackExt}`
      a.click()
      showToast('Initiated media download')
    } finally {
      setIsDownloading(false)
    }
  }

  // Quick Media Actions: Download all carousel items
  const handleDownloadAllMedia = async () => {
    if (mediaItems.length === 0) return
    setIsDownloading(true)
    try {
      for (let i = 0; i < mediaItems.length; i++) {
        const itemUrl = mediaItems[i]
        const a = document.createElement('a')
        a.href = itemUrl
        const ext = getMediaExtension(itemUrl, isVideoUrl(itemUrl) ? '.mp4' : (isGifUrl(itemUrl) ? '.gif' : '.jpg'))
        const rawName = itemUrl.split('/').pop() || `media_${i + 1}${ext}`
        const filename = rawName.includes('.') ? rawName : `${rawName}${ext}`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        await new Promise((r) => setTimeout(r, 200))
      }
      showToast(`Downloaded all ${mediaItems.length} media files`)
    } catch (err) {
      showToast('Download started')
    } finally {
      setIsDownloading(false)
    }
  }

  // Quick Media Actions: Copy caption text
  const handleCopyText = async () => {
    const textToCopy = tweetContent || tweet.content || ''
    if (!textToCopy.trim()) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      showToast('Copied post caption to clipboard!')
    } catch (err) {
      console.error(err)
    }
  }

  // Quick Media Actions: Copy image to clipboard
  const handleCopyImage = async () => {
    if (!currentMediaUrl || currentIsVideo) {
      showToast('Cannot copy video to clipboard')
      return
    }
    setIsCopyingImage(true)
    try {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = currentMediaUrl
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ])
                showToast('Image copied to clipboard! Ready to paste')
              } catch (clipErr) {
                await navigator.clipboard.writeText(window.location.origin + currentMediaUrl)
                showToast('Copied image URL to clipboard')
              }
            }
            setIsCopyingImage(false)
          }, 'image/png')
        } catch (e) {
          navigator.clipboard.writeText(window.location.origin + currentMediaUrl)
          showToast('Copied image URL to clipboard')
          setIsCopyingImage(false)
        }
      }
      img.onerror = () => {
        navigator.clipboard.writeText(window.location.origin + currentMediaUrl)
        showToast('Copied image URL to clipboard')
        setIsCopyingImage(false)
      }
    } catch (err) {
      showToast('Copied image URL')
      setIsCopyingImage(false)
    }
  }

  // Video time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      const p = videoRef.current.play()
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch((err) => {
          console.warn('Autoplay with sound prevented, retrying muted:', err)
          if (videoRef.current) {
            videoRef.current.muted = true
            setIsMuted(true)
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
          }
        })
      }
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const curr = videoRef.current.currentTime
    const dur = videoRef.current.duration || 1
    setProgress((curr / dur) * 100)
    setCurrentTime(formatTime(curr))
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(formatTime(videoRef.current.duration))
    setVideoError(false)
  }

  const handleSeek = (e) => {
    if (!videoRef.current) return
    const val = parseFloat(e.target.value)
    setProgress(val)
    if (videoRef.current.duration) {
      videoRef.current.currentTime = (val / 100) * videoRef.current.duration
    }
  }

  const handleRewind = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
  }

  const handleForward = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.min(
      videoRef.current.duration || 0,
      videoRef.current.currentTime + 10
    )
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (videoRef.current) {
      videoRef.current.volume = val
      videoRef.current.muted = val === 0
      setIsMuted(val === 0)
    }
  }

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0]
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setPlaybackRate(nextSpeed)
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed
    }
  }

  const toggleFullscreen = () => {
    if (!mediaStageRef.current) return
    if (!document.fullscreenElement) {
      mediaStageRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (showMoveModal) setShowMoveModal(false)
        else onClose()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'ArrowRight') {
        if (mediaItems.length > 1) {
          setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length)
        }
      } else if (e.key === 'ArrowLeft') {
        if (mediaItems.length > 1) {
          setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, mediaItems.length, showDeleteConfirm, showMoveModal, onClose])

  // Save Media List
  const saveMediaList = async (list) => {
    setMediaItems(list)
    const mediaPayload = list.length === 0 ? '' : JSON.stringify(list)
    const updatedPost = {
      ...tweet,
      media_url: mediaPayload,
    }

    const res = await fetch(`${apiBase}/posts/${tweet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPost),
    })
    if (res.ok) {
      if (onUpdateTweet) onUpdateTweet(updatedPost)
    }
  }

  // 1. ADD IMAGE / VIDEO ACTION
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingMedia(true)
    try {
      const data = await uploadMedia(file)
      if (data?.local_url) {
        const fullUrl = resolveMediaUrl(data.local_url)
        const updatedList = [...mediaItems, fullUrl]
        await saveMediaList(updatedList)
        setActiveMediaIndex(updatedList.length - 1)
      }
    } catch (err) {
      console.error('Failed to upload media:', err)
      alert('Failed to upload media: ' + (err.message || 'Upload failed'))
    } finally {
      setIsUploadingMedia(false)
      e.target.value = ''
    }
  }

  const handleAddMediaUrl = async (e) => {
    e.preventDefault()
    if (!customMediaUrl.trim()) return

    setIsUploadingMedia(true)
    try {
      const trimmed = customMediaUrl.trim()
      const updatedList = [...mediaItems, trimmed]
      await saveMediaList(updatedList)
      setCustomMediaUrl('')
      setShowUrlInput(false)
      setActiveMediaIndex(updatedList.length - 1)
    } catch (err) {
      console.error('Failed to add media URL:', err)
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // 2. EDIT TWEET TEXT ACTION
  const handleSaveTweetText = async () => {
    if (!tweetContent.trim()) return
    setIsSavingText(true)
    try {
      const updatedPost = {
        ...tweet,
        content: tweetContent.trim(),
      }
      const res = await fetch(`${apiBase}/posts/${tweet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      })
      if (res.ok) {
        setIsEditingText(false)
        if (onUpdateTweet) onUpdateTweet(updatedPost)
      }
    } catch (err) {
      console.error('Failed to save tweet text:', err)
    } finally {
      setIsSavingText(false)
    }
  }

  // Insert markdown helper tokens
  const handleInsertToken = (token) => {
    setTweetContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${token}` : token
    })
  }

  // 3. DELETE TWEET ACTION
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`${apiBase}/posts/${tweet.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        if (onDeleteTweet) onDeleteTweet(tweet.id)
        onClose()
      }
    } catch (err) {
      console.error('Failed to delete tweet:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // 4. MOVE TO FOLDER ACTION
  const handleMoveToFolder = async (folderId) => {
    setIsMoving(true)
    try {
      const parsedFolderId = folderId ? parseInt(folderId) : null
      const updatedPost = {
        ...tweet,
        folder_id: parsedFolderId,
      }
      const res = await fetch(`${apiBase}/posts/${tweet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      })
      if (res.ok) {
        setSelectedFolderId(folderId)
        setShowMoveModal(false)
        if (onUpdateTweet) onUpdateTweet(updatedPost)
      }
    } catch (err) {
      console.error('Failed to move tweet:', err)
    } finally {
      setIsMoving(false)
    }
  }

  // Add Comment / Note
  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return

    const newComment = {
      id: Date.now(),
      author: 'Curator',
      handle: '@internal',
      time: 'Just now',
      isAuthor: true,
      text: commentInput.trim(),
    }
    const updatedList = [newComment, ...responsesList]
    setResponsesList(updatedList)
    setCommentInput('')

    try {
      const updatedPost = {
        ...tweet,
        comment: newComment.text,
      }
      await fetch(`${apiBase}/posts/${tweet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      })
      if (onUpdateTweet) onUpdateTweet(updatedPost)
    } catch (err) {}
  }

  // Carousel navigation
  const handleNext = useCallback(() => {
    if (mediaItems.length <= 1) return
    setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }, [mediaItems.length])

  const handlePrev = useCallback(() => {
    if (mediaItems.length <= 1) return
    setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }, [mediaItems.length])

  // Keyboard navigation for Carousel and Video
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      if (isEditingText || showMoveModal || showDeleteConfirm) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === ' ' && currentIsVideo) {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMute()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        setIsZoomed((prev) => !prev)
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        handleDownloadCurrentMedia()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleCopyText()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mediaItems.length, currentIsVideo, isEditingText, showMoveModal, showDeleteConfirm, togglePlay, toggleMute, toggleFullscreen, handlePrev, handleNext, currentMediaUrl, tweetContent])

  const activeFolder = folders.find((f) => String(f.id) === String(selectedFolderId))
  const activeFolderName = activeFolder?.name || tweet.folder_name || 'Root'
  const activeSpaceObj = spaces.find((s) => s.id === (activeFolder?.space_id || tweet.space_id)) || activeSpace
  const activeSpaceName = activeSpaceObj?.name || 'Personal Space'

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  )

  // Count hashtags in copy
  const hashtagCount = (tweetContent.match(/#\w+/g) || []).length

  if (!tweet) return null

  return (
    <div className="stitch-theater-overlay">
      {/* ====================================================
          TOP APPLICATION HEADER (Screen 06 / 07 Specification)
          ==================================================== */}
      <header className="stitch-top-header" data-purpose="app-header">
        <div className="stitch-header-left">
          <button
            aria-label="Go back"
            className="stitch-back-button"
            type="button"
            onClick={onClose}
            title="Go back (Esc)"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="stitch-header-title-wrap">
            <span className="stitch-header-title">Post</span>
            <span className="stitch-media-preview-tag">
              {currentIsVideo ? 'Video Player' : isMulti ? `Image Carousel (${mediaItems.length})` : 'Media Preview'}
            </span>
          </div>

          {/* 1. Vault Location Breadcrumb */}
          <div className="stitch-vault-breadcrumb">
            <button
              type="button"
              className="stitch-breadcrumb-pill"
              onClick={() => onNavigateToFolder?.(tweet.folder_id, tweet.space_id || activeSpaceObj?.id)}
              title={`Click to open folder in workspace (${activeSpaceName} › ${activeFolderName})`}
            >
              <Folder size={13} className="text-sky-400" />
              <span className="stitch-crumb-space">{activeSpaceName}</span>
              <span className="stitch-crumb-sep">›</span>
              <span className="stitch-crumb-folder">{activeFolderName}</span>
            </button>
            <button
              type="button"
              className="stitch-breadcrumb-move-btn"
              title="Move post to another folder"
              onClick={() => setShowMoveModal(true)}
            >
              <FolderInput size={12} />
              <span>Move</span>
            </button>
          </div>
        </div>

        <div className="stitch-header-actions">
          {/* Quick Media Action: Download */}
          <button
            aria-label="Download Media"
            className="stitch-header-icon-btn"
            type="button"
            onClick={handleDownloadCurrentMedia}
            title="Download Media (D)"
          >
            <Download size={16} />
          </button>
          {/* Quick Media Action: Copy Text */}
          <button
            aria-label="Copy Caption"
            className="stitch-header-icon-btn"
            type="button"
            onClick={handleCopyText}
            title="Copy Caption Text (C)"
          >
            <Copy size={16} />
          </button>
          <button
            aria-label="Move to Folder"
            className="stitch-header-icon-btn"
            type="button"
            onClick={() => setShowMoveModal(true)}
            title="Move to Folder"
          >
            <FolderInput size={16} />
          </button>
          <button
            aria-label="Close"
            className="stitch-header-icon-btn"
            type="button"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ====================================================
          TWO-COLUMN WORKSTATION CONTAINER
          ==================================================== */}
      <main className="stitch-main-layout-container" data-purpose="main-layout-container">
        {/* ====================================================
            LEFT COLUMN: DEDICATED MEDIA STAGE (Screen 06)
            ==================================================== */}
        <section
          ref={mediaStageRef}
          className="stitch-video-display-area"
          data-purpose="video-display-area"
        >
          {/* Ambient Video Backdrop & Glow */}
          <div className="stitch-ambient-glow" />

          {/* Media Header Controls */}
          <div className="stitch-video-header-overlay">
            <div className="stitch-telemetry-tags">
              {currentIsVideo ? (
                <span className="stitch-pill-mono">Video Stream</span>
              ) : currentIsGif ? (
                <span className="stitch-pill-mono gif-badge">GIF Animation</span>
              ) : isMulti ? (
                <span className="stitch-pill-mono">
                  {activeMediaIndex + 1} / {mediaItems.length}
                </span>
              ) : (
                <span className="stitch-pill-mono">Photo</span>
              )}
            </div>

            <div className="stitch-stage-actions">
              {/* Carousel Transition Mode Selector */}
              {!currentIsVideo && isMulti && (
                <div className="stitch-carousel-effect-pill" title="Carousel transition effect">
                  {['tilt', 'slide', 'scale', 'cube', 'fade'].map((eff) => (
                    <button
                      key={eff}
                      type="button"
                      className={`stitch-effect-btn ${carouselEffect === eff ? 'active' : ''}`}
                      onClick={() => setCarouselEffect(eff)}
                    >
                      {eff}
                    </button>
                  ))}
                </div>
              )}

              {/* Aspect Ratio / Zoom Toggle */}
              {!currentIsVideo && (
                <button
                  aria-label={isZoomed ? "Zoom Out" : "Zoom In"}
                  className={`stitch-stage-btn ${isZoomed ? 'active' : ''}`}
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  title={isZoomed ? "Fit to Window (Z)" : "Actual Size / Zoom In (Z)"}
                >
                  {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                </button>
              )}

              {/* Download Current Media */}
              <button
                aria-label="Download Media"
                className="stitch-stage-btn"
                type="button"
                onClick={handleDownloadCurrentMedia}
                disabled={isDownloading}
                title={`Download current ${currentIsVideo ? 'video' : 'photo'} (D)`}
              >
                {isDownloading ? <Loader2 size={14} className="docx-spin" /> : <Download size={14} />}
              </button>

              {/* Download All (if multiple) */}
              {isMulti && (
                <button
                  aria-label="Download All Photos"
                  className="stitch-stage-btn"
                  type="button"
                  onClick={handleDownloadAllMedia}
                  title={`Download all ${mediaItems.length} photos`}
                >
                  <Download size={14} style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: '11px', marginLeft: '3px' }}>All</span>
                </button>
              )}

              <button
                aria-label="Fullscreen"
                className="stitch-stage-btn"
                type="button"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>
            </div>
          </div>

          {/* Center Main Media Surface Area */}
          <div className="stitch-media-center-surface">
            {mediaItems.length > 0 ? (
              currentIsVideo ? (
                /* Native Video Player with Interactive Play Disc */
                <div className="stitch-media-card-frame" onClick={togglePlay}>
                  <video
                    ref={videoRef}
                    key={currentMediaUrl}
                    src={resolveMediaUrl(currentMediaUrl)}
                    className="stitch-video-element"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onDurationChange={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => {
                      handleMediaError(e, currentMediaUrl)
                      setVideoError(true)
                    }}
                    playsInline
                    preload="auto"
                  />

                  {/* Video Loading Error Overlay */}
                  {videoError && (
                    <div className="stitch-video-error-badge">
                      <AlertTriangle size={18} color="#f28b82" />
                      <span>Video format not readable or file missing</span>
                    </div>
                  )}

                  {/* Centered Giant Circular Play Button */}
                  {!isPlaying && !videoError && (
                    <div className="stitch-center-play-overlay">
                      <button
                        aria-label="Play video"
                        className="stitch-giant-play-button"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePlay()
                        }}
                      >
                        <Play size={44} fill="#ffffff" color="#ffffff" style={{ marginLeft: '4px' }} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Photographic Carousel with Physics-Based Momentum Transitions */
                isMulti ? (
                  <div className="stitch-carousel-container-wrap">
                    <ErrorBoundary
                      name="Carousel"
                      fallback={
                        <div className={`stitch-carousel-stage ${isZoomed ? 'zoomed' : ''}`}>
                          {imageLoadError ? (
                            <div className="stitch-image-error-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9aa0a6', gap: '8px' }}>
                              <ImageOff size={44} color="#f28b82" />
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f3f4' }}>Media Unavailable</span>
                              <span style={{ fontSize: '12px', color: '#9aa0a6' }}>The file could not be decoded or is empty</span>
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(currentMediaUrl)}
                              alt={`Preserved frame ${activeMediaIndex + 1}`}
                              className={`stitch-carousel-photo ${isZoomed ? 'zoomed' : ''}`}
                              onClick={() => setIsZoomed(!isZoomed)}
                              onError={(e) => {
                                handleMediaError(e, currentMediaUrl)
                                if (e.currentTarget.dataset.fallbackTried) {
                                  setImageLoadError(true)
                                }
                              }}
                              style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
                            />
                          )}
                        </div>
                      }
                    >
                      <Carousel
                        key={`${tweet.id}-${carouselEffect}-${activeMediaIndex}`}
                        items={mediaItems.map((url, idx) => ({
                          id: idx,
                          image: resolveMediaUrl(url),
                          alt: `Photo ${idx + 1}`
                        }))}
                        baseWidth={960}
                        aspectRatio={1.4}
                        frame={false}
                        effect={carouselEffect}
                        indicator="dots"
                        arrows={true}
                        draggable={true}
                        theme="dark"
                        showText={false}
                        initialIndex={activeMediaIndex}
                        onChange={(idx) => setActiveMediaIndex(idx)}
                      />
                    </ErrorBoundary>
                  </div>
                ) : (
                  <div className={`stitch-carousel-stage ${isZoomed ? 'zoomed' : ''}`}>
                    {imageLoadError ? (
                      <div className="stitch-image-error-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9aa0a6', gap: '8px' }}>
                        <ImageOff size={44} color="#f28b82" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f3f4' }}>Media Unavailable</span>
                        <span style={{ fontSize: '12px', color: '#9aa0a6' }}>The file could not be decoded or is empty</span>
                      </div>
                    ) : (
                      <img
                        src={resolveMediaUrl(currentMediaUrl)}
                        alt={`Preserved frame ${activeMediaIndex + 1}`}
                        className={`stitch-carousel-photo ${isZoomed ? 'zoomed' : ''}`}
                        onClick={() => setIsZoomed(!isZoomed)}
                        onError={(e) => {
                          handleMediaError(e, currentMediaUrl)
                          if (e.currentTarget.dataset.fallbackTried) {
                            setImageLoadError(true)
                          }
                        }}
                        style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
                        title={isZoomed ? "Click to fit to window" : "Click to zoom into full resolution"}
                      />
                    )}
                  </div>
                )
              )
            ) : (
              /* Empty Media Surface State */
              <div className="stitch-empty-media-box">
                <div className="stitch-empty-media-icon">
                  <ImageIcon size={36} color="#9aa0a6" />
                </div>
                <span className="stitch-empty-media-title">No media attached to this post</span>
                <button
                  type="button"
                  className="stitch-add-media-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus size={14} /> Add photo or video
                </button>
              </div>
            )}

            {/* Universal Multi-Media Navigation Chevrons (Active when viewing video in multi-media posts) */}
            {isMulti && currentIsVideo && (
              <>
                <button
                  type="button"
                  className="stitch-carousel-chevron prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrev()
                  }}
                  title="Previous (←)"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  className="stitch-carousel-chevron next"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                  }}
                  title="Next (→)"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>

          {/* Conditional Bottom Bar: Video Controls Bar OR Carousel Filmstrip */}
          {currentIsVideo ? (
            /* Bottom Scrubber & Working Video Player Control Bar */
            <div className="stitch-video-controls-bar" data-purpose="video-controls">
              {/* Thumbnail Filmstrip for Multi-Media Posts with Video */}
              {isMulti && (
                <div className="stitch-carousel-filmstrip stitch-filmstrip-on-video">
                  {mediaItems.map((itemUrl, idx) => {
                    const isItemVid = isVideoUrl(itemUrl)
                    const isItemGif = isGifUrl(itemUrl)
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`stitch-filmstrip-thumb ${idx === activeMediaIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMediaIndex(idx)
                        }}
                        title={`Jump to frame ${idx + 1}`}
                      >
                        {isItemVid ? (
                          <div className="stitch-thumb-video-icon">
                            <VideoIcon size={14} />
                          </div>
                        ) : (
                          <>
                            <img
                              src={resolveMediaUrl(itemUrl)}
                              alt={`Thumbnail ${idx + 1}`}
                              onError={(e) => handleMediaError(e, itemUrl)}
                            />
                            {isItemGif && <span className="stitch-filmstrip-gif-tag">GIF</span>}
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Range Scrubber Progress Slider */}
              <div className="stitch-scrubber-row">
                <div
                  className="stitch-scrubber-fill"
                  style={{ width: `${progress}%` }}
                />
                <input
                  aria-label="Seek Video Slider"
                  className="stitch-scrubber-input"
                  max="100"
                  min="0"
                  step="0.1"
                  type="range"
                  value={progress}
                  onChange={handleSeek}
                />
              </div>

              {/* Controls Button Row */}
              <div className="stitch-controls-row">
                <div className="stitch-controls-left">
                  <button
                    aria-label="Play"
                    className="stitch-ctrl-btn"
                    type="button"
                    onClick={togglePlay}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <button
                    aria-label="Rewind 10 seconds"
                    className="stitch-ctrl-btn"
                    type="button"
                    onClick={handleRewind}
                    title="Rewind 10s"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    aria-label="Forward 10 seconds"
                    className="stitch-ctrl-btn"
                    type="button"
                    onClick={handleForward}
                    title="Forward 10s"
                  >
                    <RotateCw size={15} />
                  </button>

                  {/* Volume Control Group with Range Slider */}
                  <div className="stitch-volume-control-group">
                    <button
                      aria-label="Mute / Unmute"
                      className="stitch-ctrl-btn"
                      type="button"
                      onClick={toggleMute}
                      title={isMuted || volume === 0 ? 'Unmute (M)' : 'Mute (M)'}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="stitch-volume-slider"
                      title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                  </div>

                  <div className="stitch-time-display">
                    <span className="text-white font-medium">{currentTime}</span> / <span>{duration}</span>
                  </div>
                </div>

                <div className="stitch-controls-right">
                  <button
                    className="stitch-speed-btn"
                    type="button"
                    onClick={cycleSpeed}
                    title="Playback Speed"
                  >
                    {playbackRate.toFixed(1)}x
                  </button>
                  <button
                    aria-label="Fullscreen"
                    className="stitch-ctrl-btn"
                    type="button"
                    onClick={toggleFullscreen}
                    title="Fullscreen (F)"
                  >
                    {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Bottom Carousel Filmstrip & Dots Indicator Bar (For Photos) */
            mediaItems.length > 0 && (
              <div className="stitch-carousel-bottom-bar">
                {/* Thumbnails Filmstrip */}
                {isMulti && (
                  <div className="stitch-carousel-filmstrip">
                    {mediaItems.map((itemUrl, idx) => {
                      const isItemVid = isVideoUrl(itemUrl)
                      const isItemGif = isGifUrl(itemUrl)
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`stitch-filmstrip-thumb ${idx === activeMediaIndex ? 'active' : ''}`}
                          onClick={() => setActiveMediaIndex(idx)}
                          title={`Jump to frame ${idx + 1}`}
                        >
                          {isItemVid ? (
                            <div className="stitch-thumb-video-icon">
                              <VideoIcon size={14} />
                            </div>
                          ) : (
                            <>
                              <img
                                src={resolveMediaUrl(itemUrl)}
                                alt={`Thumbnail ${idx + 1}`}
                                onError={(e) => handleMediaError(e, itemUrl)}
                              />
                              {isItemGif && <span className="stitch-filmstrip-gif-tag">GIF</span>}
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Dot Indicators */}
                {isMulti && (
                  <div className="stitch-carousel-dots">
                    {mediaItems.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`stitch-carousel-dot ${idx === activeMediaIndex ? 'active' : ''}`}
                        onClick={() => setActiveMediaIndex(idx)}
                        title={`Go to frame ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Subtle Keyboard Navigation Hints Bar */}
                <div className="stitch-keyboard-hints">
                  <span className="stitch-kbd-chip"><kbd>←</kbd> <kbd>→</kbd> Navigate</span>
                  {!currentIsVideo && <span className="stitch-kbd-chip"><kbd>Z</kbd> Zoom</span>}
                  <span className="stitch-kbd-chip"><kbd>D</kbd> Download</span>
                  <span className="stitch-kbd-chip"><kbd>F</kbd> Fullscreen</span>
                  <span className="stitch-kbd-chip"><kbd>Esc</kbd> Close</span>
                </div>
              </div>
            )
          )}
        </section>

        {/* ====================================================
            RIGHT COLUMN: TWEET DETAILS & ACTION SIDEBAR
            ==================================================== */}
        <aside className="stitch-social-panel" data-purpose="social-panel">
          <div className="stitch-scrollable-content">
            {/* Top Half: Tweet Text Display Area */}
            <article className="stitch-tweet-article" data-purpose="tweet-text-display-area">
              {/* Author Badge & Folder Location Chip */}
              <div className="stitch-sidebar-meta-row">
                <div className="stitch-author-badge">
                  <div className="stitch-author-details">
                    <span className="stitch-author-name">{tweet.author_name || 'TweetVault User'}</span>
                    <span className="stitch-author-handle">{tweet.author_handle || '@archive'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="stitch-folder-location-chip"
                  onClick={() => onNavigateToFolder?.(tweet.folder_id, tweet.space_id || activeSpaceObj?.id)}
                  title={`Stored in ${activeSpaceName} › ${activeFolderName} (Click to open folder in workspace)`}
                >
                  <Folder size={12} className="text-sky-400" />
                  <span>{activeFolderName}</span>
                </button>
              </div>
              {isEditingText ? (
                /* Screen 07: Post Inspector - Inline Text Edit Mode */
                <div className="stitch-inline-edit-wrapper">
                  {/* Markdown Toolbar */}
                  <div className="stitch-editor-toolbar">
                    <div className="stitch-toolbar-buttons">
                      <button
                        type="button"
                        className="stitch-tool-btn"
                        onClick={() => handleInsertToken('**bold**')}
                        title="Bold"
                      >
                        <Bold size={13} />
                      </button>
                      <button
                        type="button"
                        className="stitch-tool-btn"
                        onClick={() => handleInsertToken('*italic*')}
                        title="Italic"
                      >
                        <Italic size={13} />
                      </button>
                      <button
                        type="button"
                        className="stitch-tool-btn"
                        onClick={() => handleInsertToken('[link](url)')}
                        title="Add Link"
                      >
                        <Link size={13} />
                      </button>
                      <span className="stitch-toolbar-divider" />
                      <button
                        type="button"
                        className="stitch-tool-btn font-mono"
                        onClick={() => handleInsertToken('#')}
                        title="Insert Hashtag"
                      >
                        <Hash size={13} />
                      </button>
                      <button
                        type="button"
                        className="stitch-tool-btn font-mono"
                        onClick={() => handleInsertToken('@')}
                        title="Insert Mention"
                      >
                        <AtSign size={13} />
                      </button>
                    </div>

                    <div className="stitch-markdown-hint">Markdown Supported</div>
                  </div>

                  {/* Textarea for post content */}
                  <textarea
                    ref={textareaRef}
                    className="stitch-inline-textarea"
                    rows={6}
                    value={tweetContent}
                    onChange={(e) => setTweetContent(e.target.value)}
                    placeholder="Write post copy..."
                    autoFocus
                  />

                  {/* Character & Tag Status Bar */}
                  <div className="stitch-editor-status-bar">
                    <div className="flex items-center space-x-2">
                      <span className="text-sky-400 font-medium">
                        {tweetContent.length} / 280
                      </span>
                      <span className="text-slate-600">•</span>
                      <span>{hashtagCount} hashtags detected</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">UTF-8</span>
                  </div>

                  {/* Save & Cancel Controls */}
                  <div className="stitch-editor-actions-row">
                    <button
                      type="button"
                      className="stitch-cancel-btn"
                      onClick={() => {
                        setTweetContent(tweet.content || '')
                        setIsEditingText(false)
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="stitch-save-btn"
                      onClick={handleSaveTweetText}
                      disabled={isSavingText}
                    >
                      {isSavingText ? (
                        <Loader2 size={13} className="docx-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Pure Tweet Copy Display (Zero Avatar, Zero Vanity Clutter) */
                <div className="stitch-pure-copy-display">
                  {formatTwitterText(tweetContent || tweet.content)}
                </div>
              )}

              {/* Action Bar with Quick Copy & Download */}
              <div className="stitch-action-bar-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                />
                {/* 1. Add Media */}
                <button
                  aria-label="Add Media"
                  title="Add Media"
                  className="stitch-action-btn flex-1"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                >
                  {isUploadingMedia ? (
                    <Loader2 size={14} className="docx-spin text-sky-400" />
                  ) : (
                    <Plus size={14} className="text-sky-400 shrink-0" />
                  )}
                  <span className="truncate">Add</span>
                </button>

                {/* 2. Edit Tweet Text */}
                <button
                  aria-label="Edit Tweet Text"
                  title="Edit Tweet Text"
                  className={`stitch-action-btn flex-1 ${
                    isEditingText ? 'active-editing' : ''
                  }`}
                  type="button"
                  onClick={() => setIsEditingText(!isEditingText)}
                >
                  <Edit3 size={14} className="shrink-0" />
                  <span className="truncate font-semibold">
                    {isEditingText ? 'Editing' : 'Edit'}
                  </span>
                </button>

                {/* 3. Copy Caption Text */}
                <button
                  aria-label="Copy Text"
                  title="Copy caption text to clipboard (C)"
                  className="stitch-action-btn flex-1"
                  type="button"
                  onClick={handleCopyText}
                >
                  <Copy size={14} className="shrink-0 text-slate-300" />
                  <span className="truncate">Copy</span>
                </button>

                {/* 4. Copy Image */}
                {!currentIsVideo && (
                  <button
                    aria-label="Copy Image"
                    title="Copy image to clipboard (Ready to paste in Telegram/Word)"
                    className="stitch-action-btn flex-1"
                    type="button"
                    onClick={handleCopyImage}
                    disabled={isCopyingImage}
                  >
                    {isCopyingImage ? (
                      <Loader2 size={14} className="docx-spin text-emerald-400" />
                    ) : (
                      <ImageIcon size={14} className="shrink-0 text-emerald-400" />
                    )}
                    <span className="truncate">Image</span>
                  </button>
                )}

                {/* 5. Download Media */}
                <button
                  aria-label="Download Media"
                  title="Download photo or video to your Downloads folder (D)"
                  className="stitch-action-btn flex-1"
                  type="button"
                  onClick={handleDownloadCurrentMedia}
                >
                  <Download size={14} className="shrink-0 text-sky-400" />
                  <span className="truncate">Save</span>
                </button>

                {/* 6. Move to Folder */}
                <button
                  aria-label="Move to Folder"
                  title="Move to Folder"
                  className="stitch-action-btn flex-1"
                  type="button"
                  onClick={() => setShowMoveModal(true)}
                >
                  <FolderInput size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">Move</span>
                </button>

                {/* 7. Delete */}
                <button
                  aria-label="Delete"
                  title="Delete"
                  className="stitch-action-btn delete-icon-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* URL Media Input Row if toggled */}
              {showUrlInput && (
                <form onSubmit={handleAddMediaUrl} className="stitch-url-input-form">
                  <input
                    type="url"
                    placeholder="Paste image or video URL..."
                    className="stitch-mini-url-input"
                    value={customMediaUrl}
                    onChange={(e) => setCustomMediaUrl(e.target.value)}
                    required
                  />
                  <button type="submit" className="stitch-save-btn mini">
                    Add
                  </button>
                </form>
              )}
            </article>

            {/* Bottom Half: Action Area & Responses List Feed */}
            <section className="stitch-responses-section" data-purpose="action-area">
              <div className="stitch-responses-header">
                <h3 className="stitch-responses-heading">Responses</h3>
                <button
                  type="button"
                  className="stitch-folder-crumb-tag"
                  onClick={() => setShowMoveModal(true)}
                  title="Click to move post to another folder"
                  style={{ cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <FolderInput size={12} />
                  <span>{activeFolderName}</span>
                  <Edit3 size={10} style={{ opacity: 0.6 }} />
                </button>
              </div>

              {/* Comments Feed Cards */}
              <div className="stitch-responses-feed">
                {responsesList.map((resp) => (
                  <div key={resp.id} className="stitch-comment-card">
                    <div className="stitch-comment-body">
                      <div className="stitch-comment-header-row">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-white text-xs">
                            {resp.author}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {resp.handle}
                          </span>
                          <span className="text-[11px] text-slate-500">• {resp.time}</span>
                        </div>
                        {resp.isAuthor && (
                          <span className="stitch-author-tag">Author</span>
                        )}
                      </div>
                      <p className="stitch-comment-text">{resp.text}</p>
                    </div>
                  </div>
                ))}

                {responsesList.length === 0 && (
                  <div className="stitch-empty-responses">
                    No curator comments or notes yet. Write a comment below.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sticky Reply / Comment Input Box at Bottom (Screen 06 Specification) */}
          <footer className="stitch-reply-footer" data-purpose="reply-composer">
            <form onSubmit={handleSendComment} className="stitch-reply-form">
              <div className="stitch-reply-composer-wrap">
                <textarea
                  className="stitch-reply-textarea"
                  placeholder="Post your comment..."
                  rows={1}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendComment(e)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="stitch-send-comment-btn"
                  title="Send Comment"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </footer>
        </aside>
      </main>

      {/* ====================================================
          MODAL: SCREEN 09 MOVE TO FOLDER DIRECTORY DIALOG
          ==================================================== */}
      {showMoveModal && (
        <div className="stitch-modal-backdrop" id="modal-backdrop" onClick={() => setShowMoveModal(false)}>
          <div
            aria-labelledby="modal-headline"
            aria-modal="true"
            className="stitch-modal-card"
            id="modal-card"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Subtle Edge Glow Line */}
            <div className="stitch-modal-glow-line" />

            {/* Header */}
            <div className="stitch-modal-header">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
                  <FolderInput size={17} />
                </div>
                <div className="flex flex-col">
                  <h2 className="stitch-modal-title" id="modal-headline">
                    Move to Folder
                  </h2>
                  <span className="stitch-modal-subtitle">
                    Select archival vault destination
                  </span>
                </div>
              </div>
              <button
                aria-label="Close dialog"
                className="stitch-modal-close-btn"
                type="button"
                onClick={() => setShowMoveModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Search Filter */}
            <div className="px-5 py-2">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  className="stitch-search-input"
                  placeholder="Search destination folders..."
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Folder Selection Directory List */}
            <div className="stitch-folder-list-wrap">
              {/* Root / Uncategorized */}
              <div
                className={`stitch-folder-row ${!selectedFolderId ? 'active' : ''}`}
                onClick={() => handleMoveToFolder('')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
                    <Folder size={17} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="stitch-folder-name truncate">Root / Uncategorized</span>
                    <span className="stitch-folder-path">/vault/root</span>
                  </div>
                </div>
                {!selectedFolderId && (
                  <div className="stitch-selected-badge">
                    <Check size={13} className="font-bold" />
                  </div>
                )}
              </div>

              {/* Dynamic Folders */}
              {filteredFolders.map((f) => {
                const isSelected = String(f.id) === String(selectedFolderId)
                return (
                  <div
                    key={f.id}
                    className={`stitch-folder-row ${isSelected ? 'active' : ''}`}
                    onClick={() => handleMoveToFolder(String(f.id))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${f.color || '#38bdf8'}20`,
                          color: f.color || '#38bdf8',
                        }}
                      >
                        <Folder size={17} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="stitch-folder-name truncate">{f.name}</span>
                        <span className="stitch-folder-path">
                          /vault/{f.name.toLowerCase().replace(/\s+/g, '-')}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="stitch-selected-badge">
                        <Check size={13} className="font-bold" />
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredFolders.length === 0 && (
                <div className="stitch-empty-search">
                  No folders matched "{folderSearchQuery}"
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="stitch-modal-footer">
              <button
                type="button"
                className="stitch-cancel-btn"
                onClick={() => setShowMoveModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: SCREEN 10 SAFE DELETE CONFIRMATION DIALOG
          ==================================================== */}
      {showDeleteConfirm && (
        <div
          className="stitch-modal-backdrop"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="stitch-delete-dialog-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stitch-delete-icon-wrap">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>

            <h3 className="stitch-delete-title">Delete Tweet from Vault?</h3>
            <p className="stitch-delete-description">
              This action will permanently delete this preserved post record from your vault.
            </p>

            {/* Purge Toggle */}
            <label className="stitch-purge-toggle-row">
              <input
                type="checkbox"
                checked={purgeDiskFiles}
                onChange={(e) => setPurgeDiskFiles(e.target.checked)}
                className="stitch-checkbox"
              />
              <span className="stitch-purge-label">
                Purge cached media from disk storage (~14.2 MB)
              </span>
            </label>

            {/* Actions */}
            <div className="stitch-delete-actions-row">
              <button
                type="button"
                className="stitch-cancel-btn flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="stitch-confirm-delete-btn flex-1"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 size={13} className="docx-spin mr-1" />
                ) : (
                  <Trash2 size={14} className="mr-1" />
                )}
                <span>Delete Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification for Copy/Download Actions */}
      {toastMsg && (
        <div className="stitch-floating-toast">
          <Check size={15} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
