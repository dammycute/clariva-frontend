'use client';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', loading }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-[380px] max-w-[95vw] p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-[#0D2B55] mb-2">{title}</h3>
        <p className="text-sm text-[#64748B] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading}
            className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA] disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="text-sm px-4 py-2 rounded-lg bg-[#B91C1C] text-white hover:bg-[#991B1B] disabled:opacity-50">
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
