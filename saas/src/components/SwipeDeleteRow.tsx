import { useEffect, useRef, useState, type ReactNode, type PointerEvent, type MouseEvent } from 'react';
import { useI18n } from '../i18n';

const ACTION_WIDTH = 76;

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM8 9h2v10H8V9zM7 21h10a1 1 0 0 0 1-1V8H6v12a1 1 0 0 0 1 1z"
      />
    </svg>
  );
}

export function SwipeDeleteRow({
  open,
  onOpenChange,
  onDelete,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const axis = useRef<'x' | 'y' | null>(null);
  const suppressClick = useRef(false);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useI18n();

  const moveTo = (value: number) => {
    const next = Math.max(0, Math.min(ACTION_WIDTH, value));
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    moveTo(open ? ACTION_WIDTH : 0);
  }, [open]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    startY.current = event.clientY;
    dragging.current = true;
    axis.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = startX.current - event.clientX;
    const dy = Math.abs(event.clientY - startY.current);
    if (!axis.current) {
      if (Math.abs(dx) < 8 && dy < 8) return;
      axis.current = Math.abs(dx) > dy ? 'x' : 'y';
      if (axis.current === 'x') setIsDragging(true);
    }
    if (axis.current !== 'x') return;
    event.preventDefault();
    const base = open ? ACTION_WIDTH : 0;
    moveTo(base + dx);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    if (axis.current === 'x') {
      suppressClick.current = true;
      onOpenChange(offsetRef.current > ACTION_WIDTH * 0.35);
    }
    axis.current = null;
  };

  const onFrontClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current || open) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
      if (open) onOpenChange(false);
    }
  };

  return (
    <div className="swipe-row">
      <div className="swipe-row-actions">
        <button type="button" className="swipe-delete" aria-label={t('swipe.delete')} onClick={onDelete}>
          <TrashIcon />
        </button>
      </div>
      <div
        className={`swipe-row-front${isDragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateX(-${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onFrontClick}
      >
        {children}
      </div>
    </div>
  );
}
