import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';

export interface ProcessingStageDef {
  id: string;
  label: string;
}

export const PIPELINE_STAGES: ProcessingStageDef[] = [
  { id: 'wristband', label: '1. Wristband identity verified' },
  { id: 'align', label: '2. Wristband found / aligned' },
  { id: 'badge', label: '3. Badge validity checked' },
  { id: 'quality', label: '4. Image quality passed' },
  { id: 'sensing', label: '5. Sensing region detected' },
  { id: 'reference', label: '6. Reference patch detected' },
  { id: 'expiry', label: '7. Expiry indicator checked' },
  { id: 'refcolour', label: '8. Reference colour analysed' },
  { id: 'correct', label: '9. Lighting/reference correction applied' },
  { id: 'lab', label: '10. Colour converted to CIE Lab' },
  { id: 'de', label: '11. ΔE2000 calculated' },
  { id: 'model', label: '12. Calibration model applied' },
  { id: 'dose', label: '13. Dose and uncertainty calculated' },
];

interface ProcessingStagesProps {
  /** Index (0-based) of the stage that failed, or null if all succeeded. */
  failAt: number | null;
  onComplete: () => void;
  stageDurationMs?: number;
}

export function ProcessingStages({ failAt, onComplete, stageDurationMs = 220 }: ProcessingStagesProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const lastStage = failAt ?? PIPELINE_STAGES.length - 1;

  useEffect(() => {
    if (visibleCount > lastStage) {
      const t = setTimeout(onComplete, 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleCount((c) => c + 1), stageDurationMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
      <div className="mx-auto max-w-sm space-y-3">
        {PIPELINE_STAGES.map((stage, i) => {
          if (i > visibleCount) return null;
          const isFailed = failAt !== null && i === failAt;
          const isDone = i < visibleCount || (i === visibleCount && i !== failAt);
          const isActive = i === visibleCount && !isFailed;

          return (
            <AnimatePresence key={stage.id} mode="popLayout">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isFailed
                      ? 'bg-red-100 text-red-600'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {isFailed ? (
                    <X size={14} />
                  ) : isDone ? (
                    <Check size={14} />
                  ) : (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                </span>
                <span className={`text-sm font-medium ${isFailed ? 'text-red-700' : 'text-ink-800'}`}>
                  {stage.label}
                </span>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>
    </motion.div>
  );
}
