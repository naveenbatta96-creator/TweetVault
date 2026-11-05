import React from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import Modal from '../shared/Modal'

export default function BulkDeleteModal({
  isOpen,
  onClose,
  selectedCount = 0,
  isOperating = false,
  onConfirmBulkDelete,
}) {
  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isOperating && onClose()}
      title={`Delete ${selectedCount} items?`}
      icon={<Trash2 size={20} />}
      iconColor="var(--md-sys-color-error, #ffb4ab)"
      dialogClassName="md3-dialog"
      maxWidth="440px"
    >
      <Modal.Body style={{ padding: '8px 24px 20px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--md-sys-color-on-surface-variant, #c4c6d0)',
          }}
        >
          These items will be permanently removed from your vault. This action
          cannot be undone.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
          disabled={isOperating}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{
            background: 'var(--md-sys-color-error, #ffb4ab)',
            color: '#690005',
            fontWeight: 600,
          }}
          onClick={onConfirmBulkDelete}
          disabled={isOperating}
        >
          {isOperating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Deleting...</span>
            </>
          ) : (
            <span>Delete permanently</span>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

