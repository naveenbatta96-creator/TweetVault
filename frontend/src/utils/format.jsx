import React from 'react'

// Highlight hashtags and mentions in sky blue
export function formatTwitterText(text) {
  if (!text) return ''
  const parts = text.split(/(\B#\w+|\B@\w+|https?:\/\/[^\s]+)/g)
  return parts.map((part, index) => {
    if (part.startsWith('#') || part.startsWith('@') || part.startsWith('http')) {
      return (
        <span key={index} className="stitch-text-highlight">
          {part}
        </span>
      )
    }
    return part
  })
}

