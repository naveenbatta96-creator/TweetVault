import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  iconColor = '#a8c7fa',
  dialogClassName = '',
  maxWidth,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog ${dialogClassName}`}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className="modal-header">
            <div className="flex items-center gap-3">
              {icon && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${iconColor}22`,
                    color: iconColor,
                  }}
                >
                  {icon}
                </div>
              )}
              {title && <h3 className="modal-title">{title}</h3>}
            </div>
            <button className="modal-close-btn" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

Modal.Body = function ModalBody({ className = '', children, ...props }) {
  return (
    <div className={`modal-body ${className}`} {...props}>
      {children}
    </div>
  )
}

Modal.Footer = function ModalFooter({ className = '', children, ...props }) {
  return (
    <div className={`modal-footer ${className}`} {...props}>
      {children}
    </div>
  )
}

