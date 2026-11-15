/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported directly from AOSP Material Components BaseSlider.java & SliderTokens.kt:
 * - 44dp vertical handle (4dp rest -> 2dp pressed via spring physics)
 * - 6dp thumb-to-track gap
 * - 2dp inside corner radius, full pill outside corner radius
 * - 4dp stop indicator dot at end of inactive track
 * - Edge-clamped travel so the handle never overhangs past container bounds
 */

import React, { useCallback, useRef, useState } from 'react';
import { ExpressiveMotionTokens } from '../../aosp/md3Tokens';
import { SLIDER_SPEC } from '../../aosp/SliderSpec';
import { useAospSpring } from '../../aosp/SpringAnimation';
import { useMd3Theme } from '../../aosp/ThemeContext';

export interface Md3SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  sublabel?: string;
  trackSize?: 'xsmall' | 'small' | 'medium';
  onChange: (val: number) => void;
  disabled?: boolean;
}

export const Md3Slider: React.FC<Md3SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
  sublabel,
  trackSize = 'small',
  onChange,
  disabled = false,
}) => {
  const { scheme, reducedMotion } = useMd3Theme();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);

  const trackHeight =
    trackSize === 'medium'
      ? SLIDER_SPEC.TRACK_HEIGHT_MEDIUM_PX
      : trackSize === 'small'
        ? SLIDER_SPEC.TRACK_HEIGHT_SMALL_PX
        : SLIDER_SPEC.TRACK_HEIGHT_XSMALL_PX;

  const fraction = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const targetHandleWidth = dragging
    ? SLIDER_SPEC.HANDLE_WIDTH_PRESSED_PX
    : SLIDER_SPEC.HANDLE_WIDTH_REST_PX;

  const handleWidth = useAospSpring(
    targetHandleWidth,
    ExpressiveMotionTokens.FAST_SPATIAL,
    reducedMotion,
    0.05
  );
  const tooltipScale = useAospSpring(
    dragging || focused ? 1 : 0,
    ExpressiveMotionTokens.FAST_SPATIAL,
    reducedMotion,
    0.02
  );

  const commitRatio = useCallback(
    (ratio: number) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      const raw = min + clamped * (max - min);
      const stepped = Math.round((raw - min) / step) * step + min;
      const rounded = Number(Math.max(min, Math.min(max, stepped)).toFixed(4));
      onChange(rounded);
    },
    [min, max, step, onChange]
  );

  // Travel inset keeps handle strictly inside container bounds
  const sidePadPx = 4;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const usableWidth = Math.max(1, rect.width - sidePadPx * 2);
      const ratio = (clientX - (rect.left + sidePadPx)) / usableWidth;
      commitRatio(ratio);
    },
    [commitRatio]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Number(Math.min(max, value + step).toFixed(4)));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Number(Math.max(min, value - step).toFixed(4)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;
  const gap = SLIDER_SPEC.THUMB_TRACK_GAP_PX;
  const halfHandle = handleWidth * 0.5;
  const outerRadius = Math.round(trackHeight * 0.5);
  const innerRadius = SLIDER_SPEC.TRACK_INSIDE_CORNER_PX;
  const stopSize = SLIDER_SPEC.STOP_INDICATOR_SIZE_PX;

  // Position expression within [sidePadPx, 100% - sidePadPx]
  const handleCenterCss = `calc(${sidePadPx}px + (100% - ${sidePadPx * 2}px) * ${fraction})`;
  const activeWidthCss = `max(0px, calc(${handleCenterCss} - ${gap + halfHandle}px))`;
  const inactiveWidthCss = `max(0px, calc(100% - ${handleCenterCss} - ${gap + halfHandle}px))`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium" style={{ color: scheme.onSurface }}>
            {label}
          </span>
          {sublabel && (
            <span className="text-xs leading-snug" style={{ color: scheme.onSurfaceVariant }}>
              {sublabel}
            </span>
          )}
        </div>
        <span
          className="font-mono-tabular text-xs font-semibold whitespace-nowrap shrink-0"
          style={{ color: scheme.primary }}
        >
          {displayValue}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`relative h-12 w-full flex items-center select-none touch-none outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {/* Active Track (Left) */}
        <div
          className="absolute left-0 transition-[height] duration-150"
          style={{
            height: `${trackHeight}px`,
            width: activeWidthCss,
            backgroundColor: scheme.primary,
            borderTopLeftRadius: `${outerRadius}px`,
            borderBottomLeftRadius: `${outerRadius}px`,
            borderTopRightRadius: `${innerRadius}px`,
            borderBottomRightRadius: `${innerRadius}px`,
          }}
        />

        {/* Inactive Track (Right) with AOSP Stop Indicator */}
        <div
          className="absolute right-0 transition-[height] duration-150 flex items-center justify-end pr-2"
          style={{
            height: `${trackHeight}px`,
            width: inactiveWidthCss,
            backgroundColor: scheme.secondaryContainer,
            borderTopLeftRadius: `${innerRadius}px`,
            borderBottomLeftRadius: `${innerRadius}px`,
            borderTopRightRadius: `${outerRadius}px`,
            borderBottomRightRadius: `${outerRadius}px`,
          }}
        >
          {fraction < 0.93 && (
            <span
              aria-hidden="true"
              className="rounded-full shrink-0"
              style={{
                width: `${stopSize}px`,
                height: `${stopSize}px`,
                backgroundColor: scheme.onSecondaryContainer,
              }}
            />
          )}
        </div>

        {/* AOSP 44dp Vertical Handle + Spring Value Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: handleCenterCss }}
        >
          {tooltipScale > 0.04 && (
            <div
              className="absolute -top-9 px-2.5 py-1 rounded-full text-xs font-mono-tabular font-semibold whitespace-nowrap shadow-sm"
              style={{
                backgroundColor: scheme.inverseSurface,
                color: scheme.inverseOnSurface,
                transform: `scale(${Math.max(0, tooltipScale).toFixed(3)}) translateY(${((1 - tooltipScale) * 6).toFixed(2)}px)`,
                opacity: Math.max(0, Math.min(1, tooltipScale)),
                transformOrigin: 'bottom center',
              }}
            >
              {displayValue}
            </div>
          )}

          {focused && (
            <span
              aria-hidden="true"
              className="absolute rounded-full opacity-20"
              style={{
                width: '18px',
                height: `${SLIDER_SPEC.HANDLE_HEIGHT_PX + 6}px`,
                backgroundColor: scheme.primary,
              }}
            />
          )}

          <span
            aria-hidden="true"
            className="rounded-full transition-colors duration-150"
            style={{
              width: `${handleWidth}px`,
              height: `${SLIDER_SPEC.HANDLE_HEIGHT_PX}px`,
              backgroundColor: scheme.primary,
              boxShadow: dragging ? `0 0 0 2px ${scheme.surface}` : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
};
