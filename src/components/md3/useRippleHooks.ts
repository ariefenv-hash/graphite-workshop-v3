/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  FrameworkRippleSession,
  FrameworkShaderOptions,
  getDevicePixelRatioCapped,
  getRippleRenderer,
  pruneRipplePool,
  RippleMaskShape,
  SYSTEMUI_RIPPLE_CONSTANTS,
  SystemUIRippleSession,
  SystemUIShape,
} from '../../aosp/RippleShader';
import { useMd3Theme } from '../../aosp/ThemeContext';

interface FrameworkRippleHookOptions {
  cornerRadius?: number;
  maskShape?: RippleMaskShape;
  shaderOptions?: FrameworkShaderOptions;
  maxPoolSize?: number;
  speedMultiplier?: number;
}

export function useFrameworkRipple(options?: FrameworkRippleHookOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<FrameworkRippleSession[]>([]);
  const activeRef = useRef<FrameworkRippleSession | null>(null);
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);

  const { scheme, reducedMotion, noFlashVisuals, reportDebugSample } = useMd3Theme();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const noFlashRef = useRef(noFlashVisuals);
  noFlashRef.current = noFlashVisuals;

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = null;
      return;
    }
    const now = performance.now();
    const dpr = getDevicePixelRatioCapped();
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const pw = Math.max(1, Math.round(width * dpr));
    const ph = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = null;
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    poolRef.current = pruneRipplePool(poolRef.current, optionsRef.current?.maxPoolSize ?? 4, now);
    if (poolRef.current.length === 0) {
      rafRef.current = null;
      return;
    }

    getRippleRenderer().renderFrameworkSessions(
      ctx,
      width,
      height,
      dpr,
      poolRef.current,
      now,
      noFlashRef.current
    );
    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const ensureTick = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(drawFrame);
    }
  }, [drawFrame]);

  useEffect(() => () => stopRaf(), [stopRaf]);

  const triggerDown = useCallback(
    (
      touchX: number,
      touchY: number,
      width: number,
      height: number,
      overrideOpts?: FrameworkShaderOptions,
      colors?: {
        color?: [number, number, number, number];
        sparkleColor?: [number, number, number, number];
      }
    ) => {
      if (reducedMotion) return;
      const now = performance.now();
      const base = optionsRef.current;
      const session = new FrameworkRippleSession({
        id: nextIdRef.current++,
        width,
        height,
        touchX,
        touchY,
        startTimeMs: now,
        color: colors?.color ?? scheme.rippleWaveRgba,
        sparkleColor: colors?.sparkleColor ?? scheme.rippleSparkleRgba,
        cornerRadius: base?.cornerRadius ?? 16,
        hasMask: true,
        speedMultiplier: base?.speedMultiplier ?? 1,
        options: {
          ...base?.shaderOptions,
          ...overrideOpts,
          maskShape: overrideOpts?.maskShape ?? base?.maskShape ?? RippleMaskShape.ROUNDED_RECT,
          lacquerColor:
            overrideOpts?.lacquerColor ?? base?.shaderOptions?.lacquerColor ?? scheme.lacquerTintRgba,
        },
      });
      activeRef.current = session;
      poolRef.current = pruneRipplePool(
        [...poolRef.current, session],
        base?.maxPoolSize ?? 4,
        now
      );
      reportDebugSample({
        progress: 0,
        phase: 'enter',
        delayMs: 450,
        maskShape: session.options.maskShape,
      });
      ensureTick();
    },
    [reducedMotion, scheme, ensureTick, reportDebugSample]
  );

  const triggerUp = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    const now = performance.now();
    const delayMs = active.computeDelay(now);
    active.release(now);
    reportDebugSample({
      progress: 0.5,
      phase: delayMs > 0 ? 'hold->exit(delayed)' : 'exit',
      delayMs: Math.round(delayMs),
      maskShape: active.options.maskShape,
    });
    activeRef.current = null;
    ensureTick();
  }, [ensureTick, reportDebugSample]);

  const pulseOnce = useCallback(
    (
      touchX: number,
      touchY: number,
      width: number,
      height: number,
      overrideOpts?: FrameworkShaderOptions,
      colors?: {
        color?: [number, number, number, number];
        sparkleColor?: [number, number, number, number];
      }
    ) => {
      triggerDown(touchX, touchY, width, height, overrideOpts, colors);
      triggerUp();
    },
    [triggerDown, triggerUp]
  );

  return { canvasRef, triggerDown, triggerUp, pulseOnce };
}

export interface EmitTradeRippleParams {
  centerX: number;
  centerY: number;
  targetWidth?: number;
  targetHeight?: number;
  shape?: SystemUIShape;
  isGold?: boolean;
  sparkleStrength?: number;
  distortFactor?: number;
}

export function useSystemUIRipple() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<SystemUIRippleSession[]>([]);
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const { scheme, reducedMotion, noFlashVisuals } = useMd3Theme();
  const noFlashRef = useRef(noFlashVisuals);
  noFlashRef.current = noFlashVisuals;

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = null;
      return;
    }
    const now = performance.now();
    const dpr = getDevicePixelRatioCapped();
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const pw = Math.max(1, Math.round(width * dpr));
    const ph = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = null;
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    poolRef.current = pruneRipplePool(
      poolRef.current,
      6,
      now,
      (item, t) => t - item.startTimeMs >= item.durationMs
    );
    if (poolRef.current.length === 0) {
      rafRef.current = null;
      return;
    }

    getRippleRenderer().renderSystemUISessions(
      ctx,
      width,
      height,
      dpr,
      poolRef.current,
      now,
      noFlashRef.current
    );
    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => () => stopRaf(), [stopRaf]);

  const emitTradeRipple = useCallback(
    (params: EmitTradeRippleParams) => {
      if (reducedMotion || !canvasRef.current) return;
      const now = performance.now();
      const width = canvasRef.current.clientWidth || 300;
      const height = canvasRef.current.clientHeight || 200;
      const session: SystemUIRippleSession = {
        id: nextIdRef.current++,
        width,
        height,
        centerX: params.centerX,
        centerY: params.centerY,
        targetWidth: params.targetWidth ?? 160,
        targetHeight: params.targetHeight ?? 160,
        startTimeMs: now,
        durationMs: SYSTEMUI_RIPPLE_CONSTANTS.RIPPLE_DURATION_MS,
        shape: params.shape ?? SystemUIShape.CIRCLE,
        sparkleStrength: params.sparkleStrength ?? (params.isGold ? 0.95 : 0.65),
        distortFactor: params.distortFactor ?? 0.55,
        color: params.isGold ? [0.92, 0.66, 0.14, 0.55] : scheme.tradeWaveRgba,
        sparkleColor: params.isGold ? scheme.tradeGoldSparkleRgba : [0.95, 0.96, 1.0, 0.85],
      };
      poolRef.current = [...poolRef.current.slice(-5), session];
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(drawFrame);
      }
    },
    [reducedMotion, scheme, drawFrame]
  );

  return { canvasRef, emitTradeRipple };
}
