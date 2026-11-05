import React from 'react'
import { Folder } from 'lucide-react'

export default function EmptyState({
  icon = <Folder size={32} />,
  title = 'No items found',
  description = 'Add content to get started',
  action,
}) {
  return (
    <div className="md3-empty-state">
      <div className="md3-empty-icon-box">{icon}</div>
      <h3 className="md3-title-medium">{title}</h3>
      <p className="md3-body-small text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

