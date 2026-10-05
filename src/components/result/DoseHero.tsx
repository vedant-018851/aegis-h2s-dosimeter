import { motion } from 'framer-motion';
import type { DoseEstimate } from '../../types';
import { StatusPill, DisclaimerTag } from '../common/StatusPill';
import { confidenceTone, exposureCategoryLabel, exposureCategoryTone } from '../../utils/format';
import { PROTOTYPE_ESTIMATE_LABEL, CALIBRATION_STATUS_LABEL, SAFETY_COMPLEMENT_NOTE } from '../../data/constants';

export function DoseHero({ dose }: { dose: DoseEstimate }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-ink-900 px-6 py-7 text-center text-white"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-300">Cumulative Exposure</p>
      <div className="mt-2 flex items-end justify-center gap-2">
        <span className="tabular text-6xl font-bold leading-none">{dose.doseEstimate}</span>
        <span className="mb-1.5 text-lg font-medium text-ink-300">ppm·h</span>
      </div>
      <p className="tabular mt-2 text-sm text-ink-300">
        Expected range {dose.lowerBound} — {dose.upperBound} ppm·h
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <StatusPill tone={confidenceTone(dose.confidenceLabel)}>{dose.confidenceLabel} confidence</StatusPill>
        <StatusPill tone={exposureCategoryTone(dose.category)}>{exposureCategoryLabel(dose.category)}</StatusPill>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1.5">
        <DisclaimerTag>{PROTOTYPE_ESTIMATE_LABEL}</DisclaimerTag>
        <p className="text-[11px] text-ink-400">{CALIBRATION_STATUS_LABEL}</p>
        <p className="text-[10px] text-ink-500">{SAFETY_COMPLEMENT_NOTE}</p>
      </div>
    </motion.div>
  );
}
