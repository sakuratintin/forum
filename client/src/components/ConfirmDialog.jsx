export default function ConfirmDialog({ open, title, message, confirmText = '确定', cancelText = '取消', danger = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel confirm-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  )
}
