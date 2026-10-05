import { motion } from 'framer-motion';
import { Save, Check } from 'lucide-react';
import type { Measurement } from '../../types';
import { DoseHero } from './DoseHero';
import { StatusChecklist } from './StatusChecklist';
import { IntegrityGauge } from './IntegrityGauge';
import { TechnicalDetails } from './TechnicalDetails';
import { RejectedResult, ExpiredBadgeResult } from './OutcomeScreens';
import { NOT_AN_ALARM_LABEL } from '../../data/constants';
import { Button } from '../common/Button';

interface ResultViewProps {
  measurement: Measurement;
  onRetake: () => void;
  onSave?: () => void;
  saved?: boolean;
}

export function ResultView({ measurement, onRetake, onSave, saved }: ResultViewProps) {
  if (measurement.status === 'rejected') {
    return <RejectedResult reason={measurement.rejectionReason ?? 'Measurement rejected.'} onRetake={onRetake} />;
  }
  if (measurement.status === 'expired_badge') {
    return <ExpiredBadgeResult onUseValidBadge={onRetake} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {measurement.dose && (
        <>
          <DoseHero dose={measurement.dose} />
          <p className="-mt-2 text-center text-[10px] text-ink-400">{NOT_AN_ALARM_LABEL}</p>
        </>
      )}
      <StatusChecklist measurement={measurement} />
      {measurement.integrity && <IntegrityGauge integrity={measurement.integrity} />}
      <TechnicalDetails measurement={measurement} />

      {onSave && (
        <Button
          variant={saved ? 'secondary' : 'primary'}
          size="lg"
          fullWidth
          icon={saved ? <Check size={18} /> : <Save size={18} />}
          onClick={onSave}
          disabled={saved}
        >
          {saved ? 'Reading Saved' : 'Save Reading'}
        </Button>
      )}
    </motion.div>
  );
}
