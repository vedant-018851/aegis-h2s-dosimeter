import { motion } from 'framer-motion';
import { ArrowLeft, CircleCheck, TriangleAlert } from 'lucide-react';
import { DEMO_PRESETS } from '../../data/demoPresets';
import type { DemoPresetId } from '../../types';
import { DisclaimerTag } from '../common/StatusPill';

interface DemoPresetGridProps {
  onSelect: (id: DemoPresetId) => void;
  onBack: () => void;
}

export function DemoPresetGrid({ onSelect, onBack }: DemoPresetGridProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Choose a demo preset</p>
        <DisclaimerTag>Mechanism demonstration only</DisclaimerTag>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-left shadow-sm shadow-ink-900/[0.03] transition-transform active:scale-[0.98]"
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                preset.category === 'exposure' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {preset.category === 'exposure' ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">{preset.label}</p>
              <p className="text-xs text-ink-500 mt-0.5">{preset.description}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
