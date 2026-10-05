import { motion } from 'framer-motion';
import { CircleX, ShieldOff, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

export function RejectedResult({ reason, onRetake }: { reason: string; onRetake: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
        <CircleX size={28} />
      </span>
      <p className="text-lg font-bold uppercase tracking-wide text-red-700">Measurement Rejected</p>
      <p className="mt-2 max-w-xs text-sm text-red-700/80">{reason}</p>
      <Button variant="danger" size="md" className="mt-6" icon={<RotateCcw size={15} />} onClick={onRetake}>
        Retake Image
      </Button>
    </motion.div>
  );
}

export function ExpiredBadgeResult({ onUseValidBadge }: { onUseValidBadge: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center"
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <ShieldOff size={28} />
      </span>
      <p className="text-lg font-bold uppercase tracking-wide text-amber-800">Badge Expired</p>
      <p className="mt-2 max-w-xs text-sm text-amber-800/80">Quantitative measurement unavailable.</p>
      <Button variant="primary" size="md" className="mt-6" icon={<RotateCcw size={15} />} onClick={onUseValidBadge}>
        Use Valid Badge
      </Button>
    </motion.div>
  );
}
