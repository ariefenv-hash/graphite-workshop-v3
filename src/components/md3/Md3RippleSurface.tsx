/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { StateTokens } from '../../aosp/md3Tokens';
import { FrameworkShaderOptions, RippleMaskShape } from '../../aosp/RippleShader';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { useFrameworkRipple } from './useRippleHooks';

export interface Md3RippleSurfaceProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  cornerRadius?: number;
  maskShape?: RippleMaskShape;
  shaderOptions?: FrameworkShaderOptions;
  rippleColor?: [number, number, number, number];
  sparkleColor?: [number, number, number, number];
  stateLayerColor?: string;
}

export const Md3RippleSurface: React.FC<Md3RippleSurfaceProps> = ({
  children,
  className = '',
  cornerRadius = 16,
  maskShape = RippleMaskShape.ROUNDED_RECT,
  shaderOptions,
  rippleColor,
  sparkleColor,
  stateLayerColor,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onClick,
  style,
  type = 'button',
  ...rest
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const keyPressedRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const { scheme } = useMd3Theme();
  const { canvasRef, triggerDown, triggerUp } = useFrameworkRipple({
    cornerRadius,
    maskShape,
    shaderOptions,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled) {
      const el = buttonRef.current;
      if (el) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // ignore pointer capture issues in synthetic tests
        }
        const rect = el.getBoundingClientRect();
        triggerDown(
          e.clientX - rect.left,
          e.clientY - rect.top,
          rect.width,
          rect.height,
          shaderOptions,
          { color: rippleColor, sparkleColor }
        );
      }
    }
    onPointerDown?.(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = buttonRef.current;
    if (el && el.hasPointerCapture?.(e.pointerId)) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    triggerUp();
    onPointerUp?.(e);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    triggerUp();
    onPointerCancel?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter') && !e.repeat && !keyPressedRef.current) {
      keyPressedRef.current = true;
      const el = buttonRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        triggerDown(rect.width * 0.5, rect.height * 0.5, rect.width, rect.height, shaderOptions, {
          color: rippleColor,
          sparkleColor,
        });
      }
    }
    onKeyDown?.(e);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && keyPressedRef.current) {
      keyPressedRef.current = false;
      triggerUp();
    }
    onKeyUp?.(e);
  };

  const layerOpacity = disabled
    ? 0
    : focused
      ? StateTokens.FOCUS_STATE_LAYER_OPACITY
      : hovered
        ? StateTokens.HOVER_STATE_LAYER_OPACITY
        : 0;

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={(e) => {
        setHovered(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHovered(false);
        onPointerLeave?.(e);
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onClick={onClick}
      style={{
        outlineColor: scheme.primary,
        ...style,
      }}
      className={`relative overflow-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      {...rest}
    >
      {/* AOSP MD3 State Layer */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-150 z-[5]"
        style={{
          backgroundColor: stateLayerColor ?? 'currentColor',
          opacity: layerOpacity,
        }}
      />
      {/* AOSP android-17.0.0_r1 WebGL2 Framework Ripple Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full z-10"
      />
      <span className="relative z-20 flex items-center justify-center gap-2 w-full h-full">
        {children}
      </span>
    </button>
  );
};
