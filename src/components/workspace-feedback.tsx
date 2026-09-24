import { Loader2, RefreshCw } from 'lucide-react';

export function WorkspaceLoadingState({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="workspace-loading-list" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="workspace-loading-row" key={index} aria-hidden="true">
          <span className="workspace-loading-avatar" />
          <span className="workspace-loading-copy"><i /><i /></span>
        </div>
      ))}
      <span className="workspace-loading-label"><Loader2 className="spin" size={15} />{label}</span>
    </div>
  );
}

export function WorkspaceErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className="workspace-error-state" role="alert">
      <span>{message}</span>
      <button type="button" className="btn btn-ghost pill-sm" onClick={onRetry}>
        <RefreshCw size={14} />{retryLabel}
      </button>
    </div>
  );
}
