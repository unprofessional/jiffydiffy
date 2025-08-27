import React, { useMemo, useState } from "react";
import { useRecentDiffs } from "../../state/recent-diffs";

// small inline icons (no external libs); replace with your own later
const IconHistory = () => <span aria-hidden>🕘</span>;
const IconHome    = () => <span aria-hidden>🏠</span>;
const IconClear   = () => <span aria-hidden>🧹</span>;
const IconChevron = ({ open }: { open: boolean }) => <span aria-hidden>{open ? "«" : "»"}</span>;

type Props = {
  onOpenDiff?: (id: string) => void; // emit when a history item is chosen
};

export const Sidebar: React.FC<Props> = ({ onOpenDiff }) => {
  const [open, setOpen] = useState(true);
  const { items, clear } = useRecentDiffs();

  const width = open ? 260 : 64;

  const history = useMemo(() => items, [items]);

  return (
    <aside
      style={{
        width,
        transition: "width 160ms ease",
        height: "100%",
        background: "var(--sidebar-bg, #111418)",
        borderRight: "1px solid #1f2937",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center",
        padding: "12px 10px", borderBottom: "1px solid #1f2937"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconHome />
          {open && <span style={{ fontWeight: 600 }}>Dashboard</span>}
        </div>
        <button
          title={open ? "Collapse" : "Expand"}
          onClick={() => setOpen(o => !o)}
          style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", padding: 6 }}
        >
          <IconChevron open={open} />
        </button>
      </div>

      {/* group label */}
      <div style={{ padding: open ? "12px 12px 6px" : "12px 0 6px", opacity: 0.7, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: open ? "flex-start" : "center" }}>
          <IconHistory />
          {open && <span>Recent Diffs</span>}
        </div>
      </div>

      {/* list */}
      <div style={{ overflowY: "auto", padding: open ? "0 8px 8px" : "0 4px 8px" }}>
        {history.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: 13, padding: open ? "8px 8px" : "0 8px", textAlign: open ? "left" : "center" }}>
            {open ? "No diffs yet. Run one to see it here." : "—"}
          </div>
        )}
        {history.map(({ meta }) => (
          <button
            key={meta.id}
            onClick={() => onOpenDiff?.(meta.id)}
            title={`${meta.aLabel} vs ${meta.bLabel}`}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 10,
              padding: open ? "10px 10px" : "10px 6px",
              cursor: "pointer",
              color: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#0f172a")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              minWidth: 28, height: 28, borderRadius: 6, background: "#1f2937",
              display: "grid", placeItems: "center", fontSize: 12
            }}>
              {meta.hunksCount}
            </div>
            {open && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {meta.aLabel} → {meta.bLabel}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {meta.aPreview || "…"} | {meta.bPreview || "…"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                  {new Date(meta.createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* footer actions */}
      <div style={{ marginTop: "auto", borderTop: "1px solid #1f2937", padding: open ? 8 : 4 }}>
        <button
          title="Clear history"
          onClick={clear}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid #334155",
            color: "inherit",
            borderRadius: 10,
            padding: open ? "8px 10px" : "8px 6px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            cursor: "pointer"
          }}
        >
          <IconClear />
          {open && <span>Clear history</span>}
        </button>
      </div>
    </aside>
  );
};
