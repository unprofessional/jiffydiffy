// src/components/Controls.tsx
import { PlayIcon, RefreshIcon } from "./Icons";

type Props = {
  loading: boolean;
  canRunDiff: boolean; // already combined with lock in App
  error: string | null;
  onReset: () => void;
  onRun: () => void;
};

export function Controls({ loading, canRunDiff, error, onReset, onRun }: Props) {
  const disabled = loading || !canRunDiff;

  return (
    <div className="controls-row-wrap">
      <div className="controls">
        <div className="controls-row">
          <button type="button" className="btn btn-secondary" onClick={onReset} disabled={loading}>
            <RefreshIcon />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onRun}
            disabled={disabled}
            title={disabled && !loading ? "No changes since last run" : "Run Diff"}
          >
            <PlayIcon />
            <span>{loading ? "Diffing…" : "Run Diff"}</span>
          </button>
        </div>

        {error && <div className="error-text">Error: {error}</div>}
      </div>
    </div>
  );
}
