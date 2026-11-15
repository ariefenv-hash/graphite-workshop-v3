/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AOSP EdgeEffect (TYPE_STRETCH) 通用容器。
 *
 * - mode='pull'   木料仓「按住上下拽料」交互（原行为，onPullCommit 抽料），
 *                 整个容器被 scaleY 拉伸，配合 onPullProgress 上报状态。
 * - mode='scroll' 列表 / 对话框滚动到边界时的原生式拉伸回弹（容器自身滚动）。
 * - mode='window' 页面级滚动到顶/底时的拉伸回弹（监听 window，不改 DOM 滚动结构，
 *                 不引入额外的滚动容器，也不会影响 fixed 定位元素）。
 *
 * 三种模式共用 AospStretchEdgeEffect 的欠阻尼弹簧与 dampStretchVector，
 * 视觉强度不同：pull 是"拽得动"，scroll / window 是"轻轻弹一下"。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AospStretchEdgeEffect, EdgeEffectSnapshot, EdgeEffectState } from '../../aosp/EdgeEffect';

export type StretchMode = 'pull' | 'scroll' | 'window';

function useStretchEdgeController(
  onUpdate: ((snap: EdgeEffectSnapshot) => void) | undefined,
  intensity: number
) {
  const topEdgeRef = useRef(new AospStretchEdgeEffect());
  const bottomEdgeRef = useRef(new AospStretchEdgeEffect());
  const rafRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

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
    const k = intensityRef.current;
    const scaleY = 1 + Math.abs(dominant.getStretchVector()) * k + dist * k * 0.01;
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
  /** 'pull'（默认，木料仓拽料）| 'scroll'（容器内滚动边界）| 'window'（页面级滚动边界）。 */
  mode?: StretchMode;
  onPullCommit?: (peakDistance: number) => void;
  onPullProgress?: (distance: number, state: EdgeEffectState) => void;
}

export const Md3StretchContainer: React.FC<Md3StretchContainerProps> = ({
  children,
  className = '',
  mode = 'pull',
  onPullCommit,
  onPullProgress,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, lastY: 0, peakDistance: 0 });
  const wheelReleaseRef = useRef<number | null>(null);

  const { topEdgeRef, bottomEdgeRef, visualScale, snap, updateVisual, ensureTick } =
    useStretchEdgeController(onPullProgress, mode === 'pull' ? 4.2 : 1.35);

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

  useEffect(() => {
    return () => {
      if (wheelReleaseRef.current !== null) window.clearTimeout(wheelReleaseRef.current);
    };
  }, []);

  // ---------------------------------------------------------------- pull 模式
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'pull') return;
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
    if (mode !== 'pull' || !dragRef.current.active) return;
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
    if (mode !== 'pull' || !dragRef.current.active) return;
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

  // -------------------------------------------------- scroll / window 共用逻辑
  const releaseScrollEdges = useCallback(() => {
    bottomEdgeRef.current.onRelease();
    topEdgeRef.current.onRelease();
    ensureTick();
  }, [bottomEdgeRef, topEdgeRef, ensureTick]);

  const feedScrollEdge = useCallback(
    (deltaPx: number) => {
      let atTop = false;
      let atBottom = false;
      let h = 120;
      if (mode === 'window') {
        const doc = document.documentElement;
        const y = window.scrollY || doc.scrollTop || 0;
        atTop = y <= 1;
        atBottom = y + window.innerHeight >= doc.scrollHeight - 1;
        h = Math.max(120, window.innerHeight);
      } else {
        const el = hostRef.current;
        if (!el) return;
        atTop = el.scrollTop <= 1;
        atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        h = Math.max(120, el.clientHeight);
      }
      let consumed = 0;
      if (deltaPx < 0 && atTop) {
        consumed = topEdgeRef.current.onPullDistance(-deltaPx / h, 0.5);
      } else if (deltaPx > 0 && atBottom) {
        consumed = bottomEdgeRef.current.onPullDistance(deltaPx / h, 0.5);
      }
      if (consumed !== 0) updateVisual();
      // 静止 140ms 视为抬手，触发弹簧回弹
      if (wheelReleaseRef.current !== null) window.clearTimeout(wheelReleaseRef.current);
      wheelReleaseRef.current = window.setTimeout(releaseScrollEdges, 140);
    },
    [mode, topEdgeRef, bottomEdgeRef, updateVisual, releaseScrollEdges]
  );

  // window 模式：事件挂在 window 上（覆盖页面空白处滚动），不引入新滚动容器。
  useEffect(() => {
    if (mode !== 'window') return;
    let lastTouchY = 0;
    const onWheel = (e: WheelEvent) => feedScrollEdge(e.deltaY);
    const onTouchStart = (e: TouchEvent) => { lastTouchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastTouchY;
      const dy = y - lastTouchY;
      lastTouchY = y;
      feedScrollEdge(-dy);
    };
    const onTouchEnd = () => releaseScrollEdges();
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [mode, feedScrollEdge, releaseScrollEdges]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mode === 'scroll') feedScrollEdge(e.deltaY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode === 'scroll') dragRef.current.lastY = e.touches[0]?.clientY ?? 0;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'scroll') return;
    const y = e.touches[0]?.clientY ?? dragRef.current.lastY;
    const dy = y - dragRef.current.lastY;
    dragRef.current.lastY = y;
    feedScrollEdge(-dy);
  };

  const handleTouchEnd = () => {
    if (mode === 'scroll') releaseScrollEdges();
  };

  const isScroll = mode === 'scroll';
  const isPull = mode === 'pull';
  // 静止时不写 transform / will-change，避免无谓地创建 containing block，
  // 影响内部 absolute 定位元素；只在真实拉伸的帧里才挂上。
  const stretched = visualScale.scaleY > 1.0005 || visualScale.scaleY < 0.9995;
  const innerStyle: React.CSSProperties = stretched
    ? {
        transform: `scaleY(${visualScale.scaleY.toFixed(4)})`,
        transformOrigin: visualScale.origin === 'bottom' ? '50% 100%' : '50% 0%',
        willChange: 'transform',
      }
    : {};

  return (
    <div
      ref={hostRef}
      data-stretch-mode={mode}
      data-stretch-distance={snap.distance.toFixed(3)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPull(e.pointerId)}
      onPointerCancel={(e) => finishPull(e.pointerId)}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`${isPull ? 'touch-none select-none overflow-hidden' : ''} ${className}`}
      style={
        isScroll
          ? { overflowY: 'auto', overscrollBehavior: 'contain' }
          : undefined
      }
    >
      <div style={innerStyle}>
        {children}
      </div>
    </div>
  );
};
