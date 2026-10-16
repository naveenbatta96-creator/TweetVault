import React, { useState, useEffect } from 'react'
import { DecoratorNode, $getNodeByKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Trash2, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:8085/api'
  }
  return '/api'
}

// React Component to render embedded images inside Lexical
export function ImageComponent({ src, altText, nodeKey, width, height }) {
  const [editor] = useLexicalComposerContext()
  const [currentSrc, setCurrentSrc] = useState(src)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [isSavedLocally, setIsSavedLocally] = useState(
    src.startsWith('/api/media/') || src.includes('/api/media/')
  )

  useEffect(() => {
    setCurrentSrc(src)
    setIsSavedLocally(src.startsWith('/api/media/') || src.includes('/api/media/'))
  }, [src])

  // Automatically download external web images or import OneNote file:/// paths to local storage
  useEffect(() => {
    if (isSavedLocally || downloading) return

    const isExternal =
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('file://') ||
      src.startsWith('data:image/')

    if (!isExternal) return

    let isMounted = true
    setDownloading(true)
    setDownloadError(null)

    const apiBase = getApiBase()
    fetch(`${apiBase}/media/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: src }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!isMounted) return
        if (data.success && data.local_url) {
          const fullLocalUrl =
            typeof window !== 'undefined' && window.location.protocol === 'file:'
              ? `http://localhost:8085${data.local_url}`
              : data.local_url

          setCurrentSrc(fullLocalUrl)
          setIsSavedLocally(true)
          setDownloading(false)

          // Update Lexical ImageNode in document state
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (node && typeof node.setSrc === 'function') {
              node.setSrc(data.local_url)
            }
          })
        } else {
          setDownloading(false)
          setDownloadError(data.error || 'Failed to download image')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setDownloading(false)
        setDownloadError(err.message || 'Download error')
      })

    return () => {
      isMounted = false
    }
  }, [src, isSavedLocally, downloading, editor, nodeKey])

  const handleDelete = (e) => {
    e.stopPropagation()
    e.preventDefault()
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        node.remove()
      }
    })
  }

  const handleManualDownload = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDownloading(true)
    setDownloadError(null)

    const apiBase = getApiBase()
    fetch(`${apiBase}/media/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: src }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.local_url) {
          const fullLocalUrl =
            typeof window !== 'undefined' && window.location.protocol === 'file:'
              ? `http://localhost:8085${data.local_url}`
              : data.local_url

          setCurrentSrc(fullLocalUrl)
          setIsSavedLocally(true)
          setDownloading(false)

          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (node && typeof node.setSrc === 'function') {
              node.setSrc(data.local_url)
            }
          })
        } else {
          setDownloading(false)
          setDownloadError(data.error || 'Failed')
        }
      })
      .catch((err) => {
        setDownloading(false)
        setDownloadError(err.message)
      })
  }

  return (
    <span className="docx-image-node-container" contentEditable={false}>
      <span className="docx-image-node-wrapper">
        <img
          src={currentSrc}
          alt={altText || 'Embedded story image'}
          className="docx-embedded-image"
          style={{
            maxWidth: '100%',
            height: height && height !== 'inherit' ? height : 'auto',
            borderRadius: '10px',
            display: 'block',
          }}
          onError={() => {
            if (!downloading && !isSavedLocally) {
              setDownloadError('Image cannot be displayed directly')
            }
          }}
        />

        {/* Status badges & controls */}
        <span className="docx-image-overlay-controls">
          {downloading ? (
            <span className="docx-image-badge downloading" title="Downloading to local storage...">
              <Loader2 size={12} className="docx-spin" />
              <span>Downloading locally...</span>
            </span>
          ) : isSavedLocally ? (
            <span className="docx-image-badge saved" title="Stored locally in TweetVault media">
              <CheckCircle size={12} />
              <span>Local Copy</span>
            </span>
          ) : downloadError ? (
            <button
              type="button"
              className="docx-image-badge error-btn"
              onClick={handleManualDownload}
              title={`${downloadError} — Click to retry download`}
            >
              <AlertCircle size={12} />
              <span>Retry Download</span>
            </button>
          ) : (
            <button
              type="button"
              className="docx-image-badge download-btn"
              onClick={handleManualDownload}
              title="Download and save this image locally"
            >
              <Download size={12} />
              <span>Save Local</span>
            </button>
          )}

          <button
            type="button"
            className="docx-image-delete-btn"
            onClick={handleDelete}
            title="Remove image from story"
          >
            <Trash2 size={13} />
          </button>
        </span>
      </span>
    </span>
  )
}

// Lexical ImageNode Implementation
export class ImageNode extends DecoratorNode {
  __src
  __altText
  __width
  __height

  static getType() {
    return 'image'
  }

  static clone(node) {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    )
  }

  static importJSON(serializedNode) {
    const { src, altText, width, height } = serializedNode
    return $createImageNode({
      src,
      altText,
      width,
      height,
    })
  }

  exportJSON() {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    }
  }

  constructor(src, altText = '', width = 'inherit', height = 'inherit', key) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__width = width
    this.__height = height
  }

  exportDOM() {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText || 'Story image')
    if (this.__width && this.__width !== 'inherit') {
      element.setAttribute('width', String(this.__width))
    }
    if (this.__height && this.__height !== 'inherit') {
      element.setAttribute('height', String(this.__height))
    }
    element.className = 'docx-embedded-image'
    element.style.maxWidth = '100%'
    element.style.borderRadius = '10px'
    element.style.margin = '14px auto'
    element.style.display = 'block'
    return { element }
  }

  static importDOM() {
    return {
      img: () => ({
        conversion: (element) => {
          const src = element.getAttribute('src')
          if (!src) return null
          const altText = element.getAttribute('alt') || ''
          const width = element.getAttribute('width') || 'inherit'
          const height = element.getAttribute('height') || 'inherit'
          return {
            node: $createImageNode({
              src,
              altText,
              width: width !== 'inherit' ? parseInt(width, 10) || 'inherit' : 'inherit',
              height: height !== 'inherit' ? parseInt(height, 10) || 'inherit' : 'inherit',
            }),
          }
        },
        priority: 0,
      }),
    }
  }

  createDOM() {
    const span = document.createElement('span')
    span.className = 'docx-image-node-root'
    span.style.display = 'block'
    span.style.margin = '14px 0'
    return span
  }

  updateDOM() {
    return false
  }

  getSrc() {
    return this.__src
  }

  setSrc(src) {
    const writable = this.getWritable()
    writable.__src = src
  }

  decorate() {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        nodeKey={this.getKey()}
        width={this.__width}
        height={this.__height}
      />
    )
  }
}

export function $createImageNode({ src, altText = '', width = 'inherit', height = 'inherit' }) {
  return new ImageNode(src, altText, width, height)
}

export function $isImageNode(node) {
  return node instanceof ImageNode
}
