import { motion } from 'framer-motion';
import { Camera, ImagePlus, FlaskConical } from 'lucide-react';

interface CaptureMenuProps {
  onLiveCamera: () => void;
  onUpload: () => void;
  onDemoMode: () => void;
}

export function CaptureMenu({ onLiveCamera, onUpload, onDemoMode }: CaptureMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <MenuOption
        icon={<Camera size={20} />}
        title="Live camera"
        subtitle="Capture the reactive strip, reference patch and expiry indicator with your camera."
        onClick={onLiveCamera}
        primary
      />
      <MenuOption
        icon={<ImagePlus size={20} />}
        title="Upload image"
        subtitle="Choose a photo of the reactive strip, reference patch and expiry indicator."
        onClick={onUpload}
      />
      <MenuOption
        icon={<FlaskConical size={20} />}
        title="Demo mode"
        subtitle="Run the pipeline against a synthetic preset scenario."
        onClick={onDemoMode}
      />
    </motion.div>
  );
}

function MenuOption({
  icon,
  title,
  subtitle,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 sm:p-5 text-left shadow-sm shadow-ink-900/[0.03] transition-transform active:scale-[0.99] ${
        primary ? 'border-accent-300 bg-accent-50/40' : 'border-ink-200 bg-white'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          primary ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-700'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}
