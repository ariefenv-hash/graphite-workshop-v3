/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Direct TypeScript port of AOSP androidx.dynamicanimation.animation.SpringForce
 * Closed-form analytical spring ODE solver (underdamped, critically damped, overdamped).
 */

import { useEffect, useRef, useState } from 'react';

export interface SpringSpec {
  stiffness: number;
  dampingRatio: number;
}

export interface SpringMassState {
  value: number;
  velocity: number;
}

const VELOCITY_THRESHOLD_MULTIPLIER = 1000 / 16;
const DEFAULT_VALUE_THRESHOLD = 0.001;

export class AospSpringForce {
  private naturalFreq: number;
  private dampingRatio: number;
  private finalPosition = 0;
  private initialized = false;
  private gammaPlus = 0;
  private gammaMinus = 0;
  private dampedFreq = 0;
  private valueThreshold = DEFAULT_VALUE_THRESHOLD;
  private velocityThreshold = DEFAULT_VALUE_THRESHOLD * VELOCITY_THRESHOLD_MULTIPLIER;

  constructor(spec: SpringSpec, finalPosition = 0, valueThreshold = DEFAULT_VALUE_THRESHOLD) {
    this.naturalFreq = Math.sqrt(Math.max(0.001, spec.stiffness));
    this.dampingRatio = Math.max(0, spec.dampingRatio);
    this.finalPosition = finalPosition;
    this.valueThreshold = valueThreshold;
    this.velocityThreshold = valueThreshold * VELOCITY_THRESHOLD_MULTIPLIER;
  }

  setSpec(spec: SpringSpec): void {
    const nextFreq = Math.sqrt(Math.max(0.001, spec.stiffness));
    const nextDamping = Math.max(0, spec.dampingRatio);
    if (nextFreq !== this.naturalFreq || nextDamping !== this.dampingRatio) {
      this.naturalFreq = nextFreq;
      this.dampingRatio = nextDamping;
      this.initialized = false;
    }
  }

  setFinalPosition(pos: number): void {
    this.finalPosition = pos;
  }

  private init(): void {
    if (this.initialized) return;
    if (this.dampingRatio > 1) {
      this.gammaPlus =
        -this.dampingRatio * this.naturalFreq +
        this.naturalFreq * Math.sqrt(this.dampingRatio * this.dampingRatio - 1);
      this.gammaMinus =
        -this.dampingRatio * this.naturalFreq -
        this.naturalFreq * Math.sqrt(this.dampingRatio * this.dampingRatio - 1);
    } else if (this.dampingRatio >= 0 && this.dampingRatio < 1) {
      this.dampedFreq = this.naturalFreq * Math.sqrt(1 - this.dampingRatio * this.dampingRatio);
    }
    this.initialized = true;
  }

  isAtEquilibrium(value: number, velocity: number): boolean {
    return (
      Math.abs(velocity) < this.velocityThreshold &&
      Math.abs(value - this.finalPosition) < this.valueThreshold
    );
  }

  updateValues(lastDisplacement: number, lastVelocity: number, timeElapsedMs: number): SpringMassState {
    this.init();
    const deltaT = Math.min(0.064, Math.max(0.0001, timeElapsedMs / 1000));
    const lastDisp = lastDisplacement - this.finalPosition;
    let displacement: number;
    let currentVelocity: number;

    if (this.dampingRatio > 1) {
      const coeffA =
        lastDisp - (this.gammaMinus * lastDisp - lastVelocity) / (this.gammaMinus - this.gammaPlus);
      const coeffB =
        (this.gammaMinus * lastDisp - lastVelocity) / (this.gammaMinus - this.gammaPlus);
      const expMinus = Math.exp(this.gammaMinus * deltaT);
      const expPlus = Math.exp(this.gammaPlus * deltaT);
      displacement = coeffA * expMinus + coeffB * expPlus;
      currentVelocity = coeffA * this.gammaMinus * expMinus + coeffB * this.gammaPlus * expPlus;
    } else if (this.dampingRatio === 1) {
      const coeffA = lastDisp;
      const coeffB = lastVelocity + this.naturalFreq * lastDisp;
      const expTerm = Math.exp(-this.naturalFreq * deltaT);
      displacement = (coeffA + coeffB * deltaT) * expTerm;
      currentVelocity =
        (coeffA + coeffB * deltaT) * expTerm * -this.naturalFreq + coeffB * expTerm;
    } else {
      const cosCoeff = lastDisp;
      const sinCoeff =
        (1 / this.dampedFreq) * (this.dampingRatio * this.naturalFreq * lastDisp + lastVelocity);
      const expTerm = Math.exp(-this.dampingRatio * this.naturalFreq * deltaT);
      const cosVal = Math.cos(this.dampedFreq * deltaT);
      const sinVal = Math.sin(this.dampedFreq * deltaT);
      displacement = expTerm * (cosCoeff * cosVal + sinCoeff * sinVal);
      currentVelocity =
        displacement * -this.naturalFreq * this.dampingRatio +
        expTerm * (-this.dampedFreq * cosCoeff * sinVal + this.dampedFreq * sinCoeff * cosVal);
    }

    return {
      value: displacement + this.finalPosition,
      velocity: currentVelocity,
    };
  }
}

export function useAospSpring(
  target: number,
  spec: SpringSpec,
  immediate = false,
  threshold = 0.002
): number {
  const [value, setValue] = useState(target);
  const stateRef = useRef<SpringMassState>({ value: target, velocity: 0 });
  const forceRef = useRef<AospSpringForce>(new AospSpringForce(spec, target, threshold));
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (immediate) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stateRef.current = { value: target, velocity: 0 };
      setValue(target);
      return;
    }

    forceRef.current.setSpec(spec);
    forceRef.current.setFinalPosition(target);

    if (forceRef.current.isAtEquilibrium(stateRef.current.value, stateRef.current.velocity)) {
      return;
    }

    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const next = forceRef.current.updateValues(
        stateRef.current.value,
        stateRef.current.velocity,
        dt
      );
      stateRef.current = next;

      if (forceRef.current.isAtEquilibrium(next.value, next.velocity)) {
        stateRef.current = { value: target, velocity: 0 };
        setValue(target);
        rafRef.current = null;
        return;
      }

      setValue(next.value);
      rafRef.current = requestAnimationFrame(step);
    };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, spec.stiffness, spec.dampingRatio, immediate]);

  return value;
}
