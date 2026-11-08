import React from 'react';

// Confirm and cancel for an inline name field. The words say what happens; Enter and Escape do the same.
const InlineNameActions = ({ confirmLabel, onConfirm, onCancel, confirmTestId }) => (
  <div className="inline-actions">
    <button
      type="button"
      className="inline-confirm"
      onClick={onConfirm}
      onMouseDown={(e) => e.preventDefault()}
      title={`${confirmLabel} (Enter)`}
      data-testid={confirmTestId}
    >
      {confirmLabel}
    </button>
    <button
      type="button"
      className="inline-cancel"
      onClick={onCancel}
      onMouseDown={(e) => e.preventDefault()}
      title="Cancel (Esc)"
    >
      Esc
    </button>
  </div>
);

export default InlineNameActions;
