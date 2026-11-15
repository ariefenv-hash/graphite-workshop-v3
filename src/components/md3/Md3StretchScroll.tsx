/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 页面级「前级滑动」的 AOSP EdgeEffect TYPE_STRETCH。
 *
 * 与 Md3StretchContainer（料仓拽木）的区别：这里不接管 pointer、不加
 * touch-none、不 preventDefault —— 只监听 window 在滚动边界上的
 * wheel / touch 溢出量，把阻尼弹簧的拉伸向量作用到内容层。原生滚动、
 * 点击、滑块拖拽全部照常工作，因此可以直接包裹主工作区与长列表。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AospStretchEdgeEffect } from '../../aosp/EdgeEffect';
import { useMd3Theme } from '../../aosp/ThemeContext';

export interface Md3StretchScrollProps {
  children: React.ReactNode;
  className?: string;
}

export const Md3StretchScroll: React.FC<Md3StretchScrollProps> = ({ children, className = '' }) => {
  const { reducedMotion } = useMd3Theme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef(new AospStretchEdgeEffect());
  const bottomRef = useRef(new AospStretchEdgeEffect());
  const rafRef = useRef<number | null>(null);
  const touchYRef = useRef<number | null>(null);
  const [visual, setVisual] = useState({ scaleY: 1, shiftY: 0, origin: '50% 50%' });

  const draw = useCallback(() => {
    const now = performance.now();
    const topActive = topRef.current.update(now);
    const bottomActive = bottomRef.current.update(now);
    const useTop = topRef.current.getDistance() >= bottomRef.current.getDistance();
    const edge = useTop ? topRef.current : bottomRef.current;
    const distance = edge.getDistance();
    const vector = Math.abs(edge.getStretchVector());
    if (distance > 0.0005) {
      setVisual({
        scaleY: 1 + Math.min(0.045, vector * 1.35 + distance * 0.012),
        shiftY: (useTop ? 1 : -1) * Math.min(9, distance * 18),
        origin: useTop ? '50% 0%' : '50% 100%',
      });
    } else {
      setVisual({ scaleY: 1, shiftY: 0, origin: '50% 50%' });
    }
    if (topActive || bottomActive) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      rafRef.current = null;
    }
  }, []);

  const ensureTick = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const atTop = useCallback(() => (window.scrollY || document.documentElement.scrollTop || 0) <= 0, []);
  const atBottom = useCallback(() => {
    const doc = document.documentElement;
    return (window.scrollY || doc.scrollTop || 0) + window.innerHeight >= (doc.scrollHeight || 0) - 2;
  }, []);

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    const host = hostRef.current;
    const resize = () => {
      const h = Math.max(120, window.innerHeight);
      topRef.current.setSize(window.innerWidth, h);
      bottomRef.current.setSize(window.innerWidth, h);
    };
    resize();

    const pull = (sign: 1 | -1, amount: number) => {
      const edge = sign > 0 ? topRef.current : bottomRef.current;
      if (edge.getDistance() >= 0.14) {
        ensureTick();
        return;
      }
      edge.onPullDistance(Math.min(0.016, Math.abs(amount)), 0.5);
      ensureTick();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && atTop()) pull(1, -e.deltaY / window.innerHeight);
      else if (e.deltaY > 0 && atBottom()) pull(-1, e.deltaY / window.innerHeight);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y === undefined || touchYRef.current === null) return;
      const dy = y - touchYRef.current;
      touchYRef.current = y;
      if (dy > 0 && atTop()) pull(1, dy / window.innerHeight);
      else if (dy < 0 && atBottom()) pull(-1, -dy / window.innerHeight);
    };
    const release = () => {
      touchYRef.current = null;
      topRef.current.onRelease();
      bottomRef.current.onRelease();
      ensureTick();
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', release, { passive: true });
    window.addEventListener('touchcancel', release, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', release);
      window.removeEventListener('touchcancel', release);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, atTop, atBottom, ensureTick]);

  // 静止时保持 transform:none —— 否则会创建 containing block，
  // 内部 sticky / fixed 子元素（如车间吸顶头）会一直被错误定位。
  const idle = visual.scaleY === 1 && visual.shiftY === 0;

  return (
    <div ref={hostRef} className={className} data-stretch-scroll="on">
      <div
        style={{
          transform: idle ? 'none' : `translateY(${visual.shiftY.toFixed(2)}px) scaleY(${visual.scaleY.toFixed(4)})`,
          transformOrigin: visual.origin,
          willChange: idle ? 'auto' : 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
