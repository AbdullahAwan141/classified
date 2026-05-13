/**
 * TEMPORAL ENGINE - PROTOCOL ALERT BAR
 * ===================================
 * Displays temporal debt warnings and protocol violations.
 * Fixed at top when debt is active, critical for user awareness.
 * Z-index: 200 (highest for maximum visibility)
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { useGlobal } from '../../contexts/GlobalProvider';
import { Z_INDEX } from '../../design-system/theme';

interface ProtocolAlertProps {
  activeDebt: number;
  isWastedAlertActive: boolean;
}

export const ProtocolAlert: React.FC<ProtocolAlertProps> = ({ activeDebt, isWastedAlertActive }) => {
  const { alertDismissedForDebt, setAlertDismissedForDebt } = useGlobal();

  const shouldShow = isWastedAlertActive && alertDismissedForDebt !== activeDebt;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 inset-x-0 bg-[#8B0000] shadow-[inset_0_0_20px_rgba(255,255,255,0.15),0_10px_40px_rgba(0,0,0,0.5)] border-b border-white/10 flex items-center justify-center h-12 z-[200] px-6"
          style={{ zIndex: Z_INDEX.protocolAlert }}
        >
          <div className="absolute left-6 hidden md:block">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
          </div>

          <div className="flex items-center gap-4 text-white font-black uppercase text-[10px] md:text-xs tracking-[0.25em]">
            <AlertTriangle className="w-4 h-4 text-white/50" />
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              PROTOCOL VIOLATED:
              <span className="font-mono text-white text-base tabular-nums mx-2">-{activeDebt}m</span>
              DEBT RECOVERY ACTIVE
            </span>
            <AlertTriangle className="w-4 h-4 text-white/50" />
          </div>

          <button
            onClick={() => setAlertDismissedForDebt(activeDebt)}
            className="absolute right-6 p-1.5 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white group active:scale-95"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProtocolAlert;
