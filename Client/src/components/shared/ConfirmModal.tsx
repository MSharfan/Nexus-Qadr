import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

const ConfirmModal: React.FC<Props> = ({
  open,
  title = 'Confirm',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
  children,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  // determine dark mode (either via .dark class or prefers-color-scheme)
  const isDark = (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const modalStyle: React.CSSProperties | undefined = isDark ? { backgroundColor: '#0f1720', color: '#ffffff' } : undefined;
  const cancelButtonStyle: React.CSSProperties | undefined = isDark ? { backgroundColor: '#1f2937', color: '#ffffff' } : undefined;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 z-[9998]" onClick={onClose} />
      <div style={modalStyle} className="relative bg-white rounded-lg p-6 w-full max-w-md z-[9999] text-black" aria-modal>
        <h3 className="text-xl mb-2">{title}</h3>
        {description && <p className="text-sm mb-4" style={{ color: isDark ? '#d1d5db' : undefined }}>{description}</p>}
        {children}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            style={cancelButtonStyle}
            className="px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
