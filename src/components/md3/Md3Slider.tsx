/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported directly from AOSP Material Components BaseSlider.java & SliderTokens.kt:
 * - 44dp vertical handle (4dp rest -> 2dp pressed via spring physics)
 * - 6dp thumb-to-track gap / 2dp inside corner radius / stop indicator
 * - Framework RippleShader on press (same pipeline as Md3RippleSurface)
 * - AOSP EdgeEffect TYPE_STRETCH when dragging past min/max: the same
 *   damped spring used by the cedar timber bin, now applied to slider travel.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExpressiveMotionTokens } from '../../aosp/md3Tokens';
import { AospStretchEdgeEffect } from '../../aosp/EdgeEffect';
import { RippleMaskShape } from '../../aosp/RippleShader';
import { SLIDER_SPEC } from '../../aosp/SliderSpec';
import { useAospSpring } from '../../aosp/SpringAnimation';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { useFrameworkRipple } from './useRippleHooks';

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

interface StretchVisual {
  px: number;
  scale: number;
  origin: 'left' | 'right' | 'center';
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

  // Framework 涟漪：与按钮/开关同一条 AOSP RenderThread 管线。
  const { canvasRef, triggerDown, triggerUp } = useFrameworkRipple({
    cornerRadius: 12,
    maskShape: RippleMaskShape.ROUNDED_RECT,
  });

  // ---- AOSP EdgeEffect（越界拉伸）----
  const edgeRef = useRef(new AospStretchEdgeEffect());
  const rafRef = useRef<number | null>(null);
  const stretchSignRef = useRef(1);
  const [stretch, setStretch] = useState<StretchVisual>({ px: 0, scale: 1, origin: 'center' });

  const tick = useCallback(() => {
    const now = performance.now();
    const active = edgeRef.current.update(now);
    const distance = edgeRef.current.getDistance();
    const vector = Math.abs(edgeRef.current.getStretchVector());
    const sign = stretchSignRef.current;
    if (active && distance > 0.0005) {
      setStretch({
        px: sign * distance * 16,
        scale: 1 + Math.min(0.055, vector * 1.7),
        origin: sign < 0 ? 'left' : 'right',
      });
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      setStretch({ px: 0, scale: 1, origin: 'center' });
    }
  }, []);

  const ensureTick = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (el) edgeRef.current.setSize(el.clientWidth || 280, 48);
  }, []);

  const pullEdge = useCallback(
    (sign: number, over: number) => {
      if (reducedMotion) return;
      stretchSignRef.current = sign;
      // 复用 AOSP 的阻尼拉伸向量：distance 封顶，避免长距离拖拽累积到 1。
      if (edgeRef.current.getDistance() < 0.14) {
        edgeRef.current.onPullDistance(Math.min(0.018, over * 0.16), 0.5);
      }
      ensureTick();
    },
    [reducedMotion, ensureTick]
  );

  const releaseEdge = useCallback(() => {
    edgeRef.current.onRelease();
    ensureTick();
  }, [ensureTick]);

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

      // 前级滑动越界：把超出的比例喂给 AOSP 拉伸弹簧，而不是硬裁掉。
      const over = ratio < 0 ? -ratio : ratio > 1 ? ratio - 1 : 0;
      if (over > 0.001 && dragging) pullEdge(ratio < 0 ? -1 : 1, over);
    },
    [min, max, step, onChange, dragging, pullEdge]
  );

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
    const rect = e.currentTarget.getBoundingClientRect();
    triggerDown(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    triggerUp();
    releaseEdge();
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
    const rect = e.currentTarget.getBoundingClientRect();
    const pulse = () => {
      triggerDown(rect.width * 0.5, rect.height * 0.5, rect.width, rect.height);
      triggerUp();
    };
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Number(Math.min(max, value + step).toFixed(4));
      if (next === value) pullEdge(1, 0.05);
      onChange(next);
      pulse();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Number(Math.max(min, value - step).toFixed(4));
      if (next === value) pullEdge(-1, 0.05);
      onChange(next);
      pulse();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
      pulse();
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
      pulse();
    }
  };

  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;
  const gap = SLIDER_SPEC.THUMB_TRACK_GAP_PX;
  const halfHandle = handleWidth * 0.5;
  const outerRadius = Math.round(trackHeight * 0.5);
  const innerRadius = SLIDER_SPEC.TRACK_INSIDE_CORNER_PX;
  const stopSize = SLIDER_SPEC.STOP_INDICATOR_SIZE_PX;

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
        data-stretch-distance={edgeRef.current.getDistance().toFixed(3)}
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
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full z-10"
        />

        {/* 拉伸层只包裹视觉元素，不包裹交互命中区，避免 getBoundingClientRect 漂移 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateX(${stretch.px.toFixed(2)}px) scaleX(${stretch.scale.toFixed(4)})`,
            transformOrigin: stretch.origin === 'left' ? '0% 50%' : stretch.origin === 'right' ? '100% 50%' : '50% 50%',
            willChange: 'transform',
          }}
        >
          {/* Active Track (Left) */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 transition-[height] duration-150"
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
            className="absolute right-0 top-1/2 -translate-y-1/2 transition-[height] duration-150 flex items-center justify-end pr-2"
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
    </div>
  );
};
