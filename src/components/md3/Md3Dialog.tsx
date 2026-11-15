/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ElevationTokens, ExpressiveMotionTokens } from '../../aosp/md3Tokens';
import { useAospSpring } from '../../aosp/SpringAnimation';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { Md3RippleSurface } from './Md3RippleSurface';

export interface Md3DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidthClass?: string;
}

export const Md3Dialog: React.FC<Md3DialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidthClass = 'max-w-xl',
}) => {
  const { scheme, reducedMotion } = useMd3Theme();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const progress = useAospSpring(open ? 1 : 0, ExpressiveMotionTokens.DEFAULT_SPATIAL, reducedMotion, 0.01);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const scale = 0.92 + 0.08 * progress;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        style={{ opacity: Math.min(1, Math.max(0, progress)) }}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidthClass} rounded-[28px] p-6 max-h-[85vh] flex flex-col gap-4`}
        style={{
          backgroundColor: scheme.surfaceContainerHigh,
          color: scheme.onSurface,
          border: `1px solid ${scheme.outlineVariant}`,
          boxShadow: ElevationTokens.LEVEL_3,
          transform: `scale(${scale.toFixed(4)})`,
          opacity: Math.min(1, Math.max(0, progress)),
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold font-display">{title}</h2>
          <Md3RippleSurface
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            cornerRadius={20}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center cursor-pointer"
            style={{ color: scheme.onSurfaceVariant }}
          >
            <X className="w-5 h-5" />
          </Md3RippleSurface>
        </div>
        <div className="overflow-y-auto pr-1 text-sm leading-relaxed">{children}</div>
        {actions && <div className="flex items-center justify-end gap-3 pt-2">{actions}</div>}
      </div>
    </div>
  );
};
