/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ElevationTokens } from '../../aosp/md3Tokens';
import { useMd3Theme } from '../../aosp/ThemeContext';

export interface Md3CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  variant?: 'elevated' | 'filled' | 'outlined';
}

export const Md3Card: React.FC<Md3CardProps> = ({
  children,
  className = '',
  elevated = false,
  variant,
}) => {
  const { scheme } = useMd3Theme();
  const resolvedVariant = variant ?? (elevated ? 'elevated' : 'outlined');

  const cardStyle: React.CSSProperties =
    resolvedVariant === 'elevated'
      ? {
          backgroundColor: scheme.surfaceContainerLow,
          boxShadow: ElevationTokens.LEVEL_1,
        }
      : resolvedVariant === 'filled'
        ? {
            backgroundColor: scheme.surfaceContainer,
          }
        : {
            backgroundColor: scheme.surfaceContainerLowest,
            border: `1px solid ${scheme.outlineVariant}`,
          };

  return (
    <section
      className={`rounded-[20px] p-4 sm:p-5 transition-colors duration-200 ${className}`}
      style={cardStyle}
    >
      {children}
    </section>
  );
};
