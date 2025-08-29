export function EditorHeader({
  label,
  linkScroll,
  onToggleLinkScroll,
  onPrevChange,
  onNextChange,
}: {
  label: string;
  linkScroll?: boolean;
  onToggleLinkScroll?: () => void;
  onPrevChange?: () => void;
  onNextChange?: () => void;
}) {
  return (
    <div className="editor-header">
      <span>{label}</span>
      <div className="editor-actions">
        <button
          type="button"
          className={`link-btn ${linkScroll ? "active" : ""}`}
          onClick={onToggleLinkScroll}
          title={linkScroll ? "Unlink scroll" : "Link scroll"}
        >
          🔗
        </button>
        <div className="spacer" />
        <button
          type="button"
          className="nav-btn"
          onClick={onPrevChange}
          title="Previous change"
        >
          ←
        </button>
        <button
          type="button"
          className="nav-btn"
          onClick={onNextChange}
          title="Next change"
        >
          →
        </button>
      </div>
    </div>
  );
}
