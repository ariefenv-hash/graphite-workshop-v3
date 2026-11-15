/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported from AOSP Material Components & Compose Material 3:
 * - com.google.android.material.slider.BaseSlider / SliderTokens.kt
 * - com.google.android.material.materialswitch.MaterialSwitch / SwitchTokens.kt
 */

export const SLIDER_SPEC = {
  HANDLE_HEIGHT_PX: 44,
  HANDLE_WIDTH_REST_PX: 4,
  HANDLE_WIDTH_PRESSED_PX: 2,
  THUMB_TRACK_GAP_PX: 6,
  TRACK_INSIDE_CORNER_PX: 2,
  STOP_INDICATOR_SIZE_PX: 4,
  TRACK_HEIGHT_XSMALL_PX: 16,
  TRACK_HEIGHT_SMALL_PX: 24,
  TRACK_HEIGHT_MEDIUM_PX: 40,
} as const;

export const SWITCH_SPEC = {
  TRACK_WIDTH_PX: 52,
  TRACK_HEIGHT_PX: 32,
  TRACK_OUTLINE_WIDTH_PX: 2,
  UNSELECTED_HANDLE_WIDTH_PX: 16,
  UNSELECTED_HANDLE_WITH_ICON_PX: 24,
  SELECTED_HANDLE_WIDTH_PX: 24,
  PRESSED_HANDLE_WIDTH_PX: 28,
  STATE_LAYER_SIZE_PX: 40,
} as const;
