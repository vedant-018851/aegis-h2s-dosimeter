// ============================================================================
// AlignReviewStep
//
// Shown after every capture (camera, upload, or demo). The guide box starts
// at a sensible default position/size and the user can drag to reposition
// or drag the corner handle to resize it — this doubles as both the normal
// alignment confirmation step and the "manual ROI fallback" required by
// spec §8 when automatic framing isn't confident. Region proportions inside
// the box (sensing / reference / expiry) match services/imageProcessing's
// layout constants, rendered here for visual feedback only.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Move, RotateCcw, ScanSearch } from 'lucide-react';
import { Button } from '../common/Button';
import type { GuideBox } from '../../services/imageProcessing/regionSampling';

interface AlignReviewStepProps {
  frame: HTMLCanvasElement;
  onConfirm: (guideBox: GuideBox) => void;
  onRetake: () => void;
  helperText?: string;
  /** 0-1 fractions of the full image. Defaults to a generic centred box. */
  initialBoxFraction?: { x: number; y: number; width: number; height: number };
}

const DISPLAY_MAX_WIDTH = 520;
const DEFAULT_BOX_FRACTION = { x: 0.08, y: 0.28, width: 0.84, height: 0.44 };

export function AlignReviewStep({ frame, onConfirm, onRetake, helperText, initialBoxFraction }: AlignReviewStepProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dataUrl = useMemo(() => frame.toDataURL('image/jpeg', 0.85), [frame]);

  const displayScale = Math.min(1, DISPLAY_MAX_WIDTH / frame.width);
  const displayWidth = frame.width * displayScale;
  const displayHeight = frame.height * displayScale;

  const boxFraction = initialBoxFraction ?? DEFAULT_BOX_FRACTION;
  const defaultBox = useMemo(
    () => ({
      x: displayWidth * boxFraction.x,
      y: displayHeight * boxFraction.y,
      width: displayWidth * boxFraction.width,
      height: displayHeight * boxFraction.height,
    }),
    [displayWidth, displayHeight, boxFraction.x, boxFraction.y, boxFraction.width, boxFraction.height]
  );

  const [box, setBox] = useState(defaultBox);
  const dragState = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; box: typeof box } | null>(null);

  const clampBox = (b: typeof box) => ({
    x: Math.max(0, Math.min(displayWidth - 40, b.x)),
    y: Math.max(0, Math.min(displayHeight - 40, b.y)),
    width: Math.max(60, Math.min(displayWidth - b.x, b.width)),
    height: Math.max(40, Math.min(displayHeight - b.y, b.height)),
  });

  const onPointerDown = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { mode, startX: e.clientX, startY: e.clientY, box };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { mode, startX, startY, box: startBox } = dragState.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (mode === 'move') {
      setBox(clampBox({ ...startBox, x: startBox.x + dx, y: startBox.y + dy }));
    } else {
      setBox(clampBox({ ...startBox, width: startBox.width + dx, height: startBox.height + dy }));
    }
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  const resetBox = () => setBox(defaultBox);

  const handleConfirm = () => {
    const guideBox: GuideBox = {
      x: box.x / displayScale,
      y: box.y / displayScale,
      width: box.width / displayScale,
      height: box.height / displayScale,
    };
    onConfirm(guideBox);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="mb-3 flex items-center gap-2 text-ink-700">
        <ScanSearch size={16} />
        <p className="text-sm font-semibold">Confirm alignment</p>
      </div>
      <p className="text-xs text-ink-500 mb-3">
        {helperText ?? 'Drag the box to cover the sensing strip, reference patch and expiry dot. Drag the bottom-right handle to resize.'}
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto select-none overflow-hidden rounded-2xl border border-ink-200 bg-ink-900 touch-none"
        style={{ width: displayWidth, height: displayHeight }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img src={dataUrl} alt="Captured wristband" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

        <div
          className="absolute border-2 border-accent-400 bg-accent-400/10"
          style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
          onPointerDown={onPointerDown('move')}
        >
          <div className="grid h-full grid-cols-[42%_28%_14%_16%]">
            <RegionLabel label="SENSING" />
            <RegionLabel label="REF" />
            <RegionLabel label="EXP" />
            <div />
          </div>
          <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-white shadow">
            <Move size={12} />
          </span>
          <span
            onPointerDown={onPointerDown('resize')}
            className="absolute -bottom-2 -right-2 h-6 w-6 cursor-nwse-resize rounded-full bg-accent-500 shadow ring-2 ring-white"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={resetBox}>
          Reset box
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onRetake}>
            Retake
          </Button>
          <Button variant="primary" size="md" onClick={handleConfirm}>
            Run Analysis
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function RegionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-end justify-center border-r border-white/20 pb-0.5">
      <span className="text-[7px] font-bold uppercase tracking-wider text-white/70">{label}</span>
    </div>
  );
}
