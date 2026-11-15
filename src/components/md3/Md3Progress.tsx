/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported from AOSP Material 3 LinearProgressIndicator:
 * - Active indicator with 4dp gap to inactive track
 * - 4dp stop indicator dot at end of inactive track
 */

import React from 'react';
import { useMd3Theme } from '../../aosp/ThemeContext';

export interface Md3ProgressProps {
  value: number;
  label?: string;
  height?: number;
  tone?: 'primary' | 'error' | 'tertiary';
}

export const Md3Progress: React.FC<Md3ProgressProps> = ({
  value,
  label,
  height = 6,
  tone = 'primary',
}) => {
  const { scheme } = useMd3Theme();
  const pct = Math.max(0, Math.min(100, value * 100));

  const activeColor =
    tone === 'error' ? scheme.error : tone === 'tertiary' ? scheme.tertiary : scheme.primary;
  const trackColor =
    tone === 'error'
      ? scheme.errorContainer
      : tone === 'tertiary'
        ? scheme.tertiaryContainer
        : scheme.secondaryContainer;

  const gapPx = pct > 2 && pct < 98 ? 4 : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="relative w-full flex items-center"
      style={{ height: `${height}px` }}
    >
      {/* Active bar */}
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{
          width: `calc(${pct}% - ${gapPx * 0.5}px)`,
          backgroundColor: activeColor,
        }}
      />
      {/* Gap */}
      {gapPx > 0 && <div style={{ width: `${gapPx}px`, flexShrink: 0 }} />}
      {/* Inactive track with stop indicator */}
      {pct < 99.5 && (
        <div
          className="h-full rounded-full flex-1 flex items-center justify-end pr-0.5 transition-[width] duration-150"
          style={{ backgroundColor: trackColor }}
        >
          {pct < 94 && (
            <span
              aria-hidden="true"
              className="rounded-full shrink-0"
              style={{
                width: `${Math.min(4, Math.max(2, height * 0.65))}px`,
                height: `${Math.min(4, Math.max(2, height * 0.65))}px`,
                backgroundColor: activeColor,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
