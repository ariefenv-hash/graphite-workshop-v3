/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AospStretchEdgeEffect, EdgeEffectSnapshot, EdgeEffectState } from '../../aosp/EdgeEffect';

function useStretchEdgeController(onUpdate?: (snap: EdgeEffectSnapshot) => void) {
  const topEdgeRef = useRef(new AospStretchEdgeEffect());
  const bottomEdgeRef = useRef(new AospStretchEdgeEffect());
  const rafRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const [visualScale, setVisualScale] = useState<{ scaleY: number; origin: 'top' | 'bottom' }>({
    scaleY: 1,
    origin: 'bottom',
  });
  const [snap, setSnap] = useState<EdgeEffectSnapshot>(() => bottomEdgeRef.current.snapshot());

  const updateVisual = useCallback(() => {
    const topDist = topEdgeRef.current.getDistance();
    const bottomDist = bottomEdgeRef.current.getDistance();
    const dominant = bottomDist >= topDist ? bottomEdgeRef.current : topEdgeRef.current;
    const origin: 'top' | 'bottom' = bottomDist >= topDist ? 'bottom' : 'top';
    const dist = dominant.getDistance();
    const scaleY = 1 + Math.abs(dominant.getStretchVector()) * 4.2 + dist * 0.04;
    setVisualScale({ scaleY, origin });
    const nextSnap = dominant.snapshot();
    setSnap(nextSnap);
    onUpdateRef.current?.(nextSnap);
  }, []);

  const tick = useCallback(() => {
    const now = performance.now();
    const topActive = topEdgeRef.current.update(now);
    const bottomActive = bottomEdgeRef.current.update(now);
    updateVisual();
    if (topActive || bottomActive) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, [updateVisual]);

  const ensureTick = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { topEdgeRef, bottomEdgeRef, visualScale, snap, updateVisual, ensureTick };
}

export interface Md3StretchContainerProps {
  children: React.ReactNode;
  className?: string;
  onPullCommit?: (peakDistance: number) => void;
  onPullProgress?: (distance: number, state: EdgeEffectState) => void;
}

export const Md3StretchContainer: React.FC<Md3StretchContainerProps> = ({
  children,
  className = '',
  onPullCommit,
  onPullProgress,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, lastY: 0, peakDistance: 0 });

  const { topEdgeRef, bottomEdgeRef, visualScale, snap, updateVisual, ensureTick } =
    useStretchEdgeController((s) => onPullProgress?.(s.distance, s.state));

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        topEdgeRef.current.setSize(width, Math.max(120, height));
        bottomEdgeRef.current.setSize(width, Math.max(120, height));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [topEdgeRef, bottomEdgeRef]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = hostRef.current;
    if (!el) return;
    dragRef.current = { active: true, lastY: e.clientY, peakDistance: 0 };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = hostRef.current;
    if (!el) return;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastY = e.clientY;
    const h = Math.max(120, el.clientHeight);
    const rect = el.getBoundingClientRect();
    const dispX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, el.clientWidth)));

    if (dy < 0 || bottomEdgeRef.current.getDistance() > 0) {
      const consumed = bottomEdgeRef.current.onPullDistance(-dy / h, dispX);
      dragRef.current.peakDistance = Math.max(
        dragRef.current.peakDistance,
        bottomEdgeRef.current.getDistance()
      );
      if (consumed !== 0) updateVisual();
    } else if (dy > 0 || topEdgeRef.current.getDistance() > 0) {
      const consumed = topEdgeRef.current.onPullDistance(dy / h, dispX);
      dragRef.current.peakDistance = Math.max(
        dragRef.current.peakDistance,
        topEdgeRef.current.getDistance()
      );
      if (consumed !== 0) updateVisual();
    }
  };

  const finishPull = (pointerId?: number) => {
    if (!dragRef.current.active) return;
    const peak = dragRef.current.peakDistance;
    dragRef.current.active = false;
    const el = hostRef.current;
    if (el && pointerId !== undefined && el.hasPointerCapture?.(pointerId)) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    bottomEdgeRef.current.onRelease();
    topEdgeRef.current.onRelease();
    ensureTick();
    if (peak > 0.14) {
      onPullCommit?.(peak);
    }
  };

  return (
    <div
      ref={hostRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPull(e.pointerId)}
      onPointerCancel={(e) => finishPull(e.pointerId)}
      className={`touch-none select-none overflow-hidden ${className}`}
      data-stretch-distance={snap.distance.toFixed(3)}
    >
      <div
        style={{
          transform: `scaleY(${visualScale.scaleY.toFixed(4)})`,
          transformOrigin: visualScale.origin === 'bottom' ? '50% 100%' : '50% 0%',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
