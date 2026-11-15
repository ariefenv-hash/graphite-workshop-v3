/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported directly from AOSP MaterialSwitch & androidx.compose.material3.tokens.SwitchTokens:
 * - Track: 52dp x 32dp, 2dp outline when unselected
 * - Handle: 16dp/24dp unselected -> 24dp selected -> 28dp pressed (spring animated)
 * - State layer halo: 40dp circular hover/focus/press indicator
 */

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ExpressiveMotionTokens, StateTokens } from '../../aosp/md3Tokens';
import { RippleMaskShape } from '../../aosp/RippleShader';
import { SWITCH_SPEC } from '../../aosp/SliderSpec';
import { useAospSpring } from '../../aosp/SpringAnimation';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { Md3RippleSurface } from './Md3RippleSurface';

export interface Md3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  showUncheckedIcon?: boolean;
}

export const Md3Switch: React.FC<Md3SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  showUncheckedIcon = true,
}) => {
  const { scheme, reducedMotion } = useMd3Theme();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const targetSize = pressed && !disabled
    ? SWITCH_SPEC.PRESSED_HANDLE_WIDTH_PX
    : checked
      ? SWITCH_SPEC.SELECTED_HANDLE_WIDTH_PX
      : showUncheckedIcon
        ? SWITCH_SPEC.UNSELECTED_HANDLE_WITH_ICON_PX
        : SWITCH_SPEC.UNSELECTED_HANDLE_WIDTH_PX;

  const targetOffsetX = checked ? 22 : showUncheckedIcon ? 2 : 6;

  const animatedOffsetX = useAospSpring(
    targetOffsetX,
    ExpressiveMotionTokens.FAST_SPATIAL,
    reducedMotion,
    0.05
  );
  const animatedSize = useAospSpring(
    targetSize,
    ExpressiveMotionTokens.FAST_SPATIAL,
    reducedMotion,
    0.05
  );

  // Center the 28px pressed handle on the 24px track travel center
  const centeredOffsetX = animatedOffsetX - (animatedSize - (checked ? 24 : showUncheckedIcon ? 24 : 16)) * 0.5;
  const stateLayerOpacity = disabled
    ? 0
    : pressed
      ? StateTokens.PRESSED_STATE_LAYER_OPACITY
      : focused
        ? StateTokens.FOCUS_STATE_LAYER_OPACITY
        : hovered
          ? StateTokens.HOVER_STATE_LAYER_OPACITY
          : 0;

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium leading-snug" style={{ color: scheme.onSurface }}>
          {label}
        </span>
        {description && (
          <span className="text-xs leading-snug mt-0.5" style={{ color: scheme.onSurfaceVariant }}>
            {description}
          </span>
        )}
      </div>

      <Md3RippleSurface
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onPointerDown={() => !disabled && setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        cornerRadius={16}
        maskShape={RippleMaskShape.ROUNDED_RECT}
        rippleColor={checked ? [1, 1, 1, 0.2] : scheme.rippleWaveRgba}
        className="inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed !overflow-visible"
        style={{
          width: `${SWITCH_SPEC.TRACK_WIDTH_PX}px`,
          height: `${SWITCH_SPEC.TRACK_HEIGHT_PX}px`,
          backgroundColor: checked ? scheme.primary : scheme.surfaceContainerHighest,
          border: checked
            ? `${SWITCH_SPEC.TRACK_OUTLINE_WIDTH_PX}px solid ${scheme.primary}`
            : `${SWITCH_SPEC.TRACK_OUTLINE_WIDTH_PX}px solid ${scheme.outline}`,
        }}
      >
        {/* AOSP 40dp State Layer Halo centered on thumb */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-0 rounded-full transition-opacity duration-150"
          style={{
            width: `${SWITCH_SPEC.STATE_LAYER_SIZE_PX}px`,
            height: `${SWITCH_SPEC.STATE_LAYER_SIZE_PX}px`,
            transform: `translate(${centeredOffsetX + animatedSize * 0.5 - SWITCH_SPEC.STATE_LAYER_SIZE_PX * 0.5}px, -50%)`,
            backgroundColor: checked ? scheme.primary : scheme.onSurface,
            opacity: stateLayerOpacity,
          }}
        />
        {/* AOSP Thumb Handle */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-0 inline-flex items-center justify-center rounded-full transition-colors duration-150"
          style={{
            width: `${animatedSize}px`,
            height: `${animatedSize}px`,
            transform: `translate(${centeredOffsetX}px, -50%)`,
            backgroundColor: checked ? scheme.onPrimary : scheme.outline,
            color: checked ? scheme.primary : scheme.surfaceContainerHighest,
          }}
        >
          {checked ? (
            <Check className="w-3.5 h-3.5" strokeWidth={2.75} />
          ) : showUncheckedIcon ? (
            <X className="w-3 h-3" strokeWidth={2.5} />
          ) : null}
        </span>
      </Md3RippleSurface>
    </div>
  );
};
