import React, { useMemo, useState } from "react";
import { useRecentDiffs } from "../../state/recent-diffs";

// tiny inline icons (swap later if you want)
const IconHistory = () => <span aria-hidden>🕘</span>;
const IconHome    = () => <span aria-hidden>🏠</span>;
const IconClear   = () => <span aria-hidden>🧹</span>;
const IconChevron = ({ open }: { open: boolean }) => <span aria-hidden>{open ? "«" : "»"}</span>;

type Props = {
  onOpenDiff?: (id: string) => void;
};

export const Sidebar: React.FC<Props> = ({ onOpenDiff }) => {
  const [open, setOpen] = useState(false);
  const { items, clear } = useRecentDiffs();

  const history = useMemo(() => items, [items]);

  return (
    <aside
      className="sidebar"
      data-open={open ? "1" : "0"}
      // CSS var keeps stylesheets in control of layout while still letting us toggle width
      style={{ ["--sidebar-w" as any]: `${open ? 260 : 64}px` }}
    >
      {/* header */}
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <IconHome />
          {open && <span className="sidebar__brand-text">Dashboard</span>}
        </div>
        <button
          type="button"
          className="sidebar__toggle"
          title={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
        >
          <IconChevron open={open} />
        </button>
      </div>

      {/* group label */}
      <div className="sidebar__group">
        <div className="sidebar__group-inner">
          <IconHistory />
          {open && <span>Recent Diffs</span>}
        </div>
      </div>

      {/* list */}
      <div className="sidebar__list">
        {history.length === 0 ? (
          <div className="sidebar__empty">
            {open ? "No diffs yet. Run one to see it here." : "—"}
          </div>
        ) : (
          history.map(({ meta }) => (
            <button
              key={meta.id}
              type="button"
              className="sidebar__item"
              title={`${meta.aLabel} vs ${meta.bLabel}`}
              onClick={() => onOpenDiff?.(meta.id)}
            >
              <div className="sidebar__badge">{meta.hunksCount}</div>
              {open && (
                <div className="sidebar__item-text">
                  <div className="sidebar__item-title">
                    {meta.aLabel} → {meta.bLabel}
                  </div>
                  <div className="sidebar__item-sub">
                    {meta.aPreview || "…"} | {meta.bPreview || "…"}
                  </div>
                  <div className="sidebar__item-date">
                    {new Date(meta.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* footer actions */}
      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__clear"
          title="Clear history"
          onClick={clear}
        >
          <IconClear />
          {open && <span>Clear history</span>}
        </button>
      </div>
    </aside>
  );
};
