/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ElevationTokens, ExpressiveMotionTokens } from '../../aosp/md3Tokens';
import { useMd3Theme } from '../../aosp/ThemeContext';

export interface SnackbarItem {
  id: number;
  text: string;
  tone: 'normal' | 'success' | 'error';
}

export const Md3Snackbar: React.FC<{ messages: SnackbarItem[] }> = ({ messages }) => {
  const { scheme } = useMd3Theme();
  if (!messages.length) return null;
  const latest = messages[messages.length - 1];

  const bg =
    latest.tone === 'error'
      ? scheme.errorContainer
      : latest.tone === 'success'
        ? scheme.primaryContainer
        : scheme.inverseSurface;
  const fg =
    latest.tone === 'error'
      ? scheme.onErrorContainer
      : latest.tone === 'success'
        ? scheme.onPrimaryContainer
        : scheme.inverseOnSurface;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 w-full max-w-md flex justify-center">
      <div
        key={latest.id}
        role="status"
        className="px-4 py-3 rounded-xl text-sm font-medium text-center transition-all duration-200"
        style={{
          backgroundColor: bg,
          color: fg,
          boxShadow: ElevationTokens.LEVEL_3,
          transitionTimingFunction: ExpressiveMotionTokens.EMPHASIZED_DECELERATE_CSS,
        }}
      >
        {latest.text}
      </div>
    </div>
  );
};
