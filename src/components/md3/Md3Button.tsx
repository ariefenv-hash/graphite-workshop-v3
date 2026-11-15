/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AOSP Material Design 3 Expressive Button, IconButton & SegmentedButton
 * Includes MD3 Expressive pressed-shape morphing (capsule -> squircle).
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { ElevationTokens, ExpressiveMotionTokens } from '../../aosp/md3Tokens';
import { RippleMaskShape } from '../../aosp/RippleShader';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { Md3RippleSurface, Md3RippleSurfaceProps } from './Md3RippleSurface';

export type Md3ButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type Md3ButtonSize = 'sm' | 'md' | 'lg';

export interface Md3ButtonProps extends Omit<Md3RippleSurfaceProps, 'variant'> {
  variant?: Md3ButtonVariant;
  size?: Md3ButtonSize;
}

export const Md3Button: React.FC<Md3ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  maskShape = RippleMaskShape.ROUNDED_RECT,
  className = '',
  children,
  disabled,
  style,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...rest
}) => {
  const { scheme } = useMd3Theme();
  const [pressed, setPressed] = useState(false);

  const sizeClass =
    size === 'lg'
      ? 'min-h-[48px] px-6 text-sm'
      : size === 'sm'
        ? 'min-h-[40px] px-4 text-xs'
        : 'min-h-[44px] px-5 text-sm';

  const variantStyle: React.CSSProperties =
    variant === 'filled'
      ? { backgroundColor: scheme.primary, color: scheme.onPrimary }
      : variant === 'tonal'
        ? { backgroundColor: scheme.secondaryContainer, color: scheme.onSecondaryContainer }
        : variant === 'elevated'
          ? {
              backgroundColor: scheme.surfaceContainerLow,
              color: scheme.primary,
              boxShadow: ElevationTokens.LEVEL_1,
            }
          : variant === 'outlined'
            ? {
                backgroundColor: 'transparent',
                color: scheme.primary,
                border: `1px solid ${scheme.outline}`,
              }
            : { backgroundColor: 'transparent', color: scheme.primary };

  const rippleColor: [number, number, number, number] =
    variant === 'filled' ? [1, 1, 1, 0.22] : scheme.rippleWaveRgba;

  // MD3 Expressive Button shape morph: pill at rest -> expressive squircle on press
  const radiusPx = pressed && !disabled ? (size === 'sm' ? 10 : 12) : 24;

  return (
    <Md3RippleSurface
      disabled={disabled}
      cornerRadius={radiusPx}
      maskShape={maskShape}
      rippleColor={rippleColor}
      onPointerDown={(e) => {
        if (!disabled) setPressed(true);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      className={`font-medium whitespace-nowrap shrink-0 cursor-pointer transition-[border-radius,transform,opacity] duration-150 disabled:opacity-45 disabled:cursor-not-allowed ${sizeClass} ${className}`}
      style={{
        borderRadius: `${radiusPx}px`,
        transitionTimingFunction: ExpressiveMotionTokens.EMPHASIZED_DECELERATE_CSS,
        transform: pressed && !disabled ? 'scale(0.985)' : 'scale(1)',
        ...variantStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Md3RippleSurface>
  );
};

export interface Md3SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Md3SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Md3SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  ariaLabel: string;
}) {
  const { scheme } = useMd3Theme();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full overflow-hidden shrink-0"
      style={{ border: `1px solid ${scheme.outline}` }}
    >
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <Md3RippleSurface
            key={opt.value}
            cornerRadius={0}
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className="min-h-[40px] px-3.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
            style={{
              backgroundColor: selected ? scheme.secondaryContainer : 'transparent',
              color: selected ? scheme.onSecondaryContainer : scheme.onSurface,
              borderLeft: idx > 0 ? `1px solid ${scheme.outline}` : undefined,
            }}
          >
            {selected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
            <span>{opt.label}</span>
          </Md3RippleSurface>
        );
      })}
    </div>
  );
}
