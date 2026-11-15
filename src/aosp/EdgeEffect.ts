/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Direct TypeScript port of AOSP android.widget.EdgeEffect (TYPE_STRETCH)
 * Baseline: android-17.0.0_r1 / frameworks/base/core/java/android/widget/EdgeEffect.java
 */

export enum EdgeEffectState {
  IDLE = 0,
  PULL = 1,
  ABSORB = 2,
  RECEDE = 3,
  PULL_DECAY = 4,
}

export const EDGE_EFFECT_CONSTANTS = {
  LINEAR_STRETCH_INTENSITY: 0.016,
  EXP_STRETCH_INTENSITY: 0.016,
  SCROLL_DIST_AFFECTED_BY_EXP_STRETCH: 0.33,
  ON_ABSORB_VELOCITY_ADJUSTMENT: 13.0,
  NATURAL_FREQUENCY: 24.657,
  DAMPING_RATIO: 0.98,
  LINEAR_VELOCITY_TAKE_OVER: 200.0,
  LINEAR_DISTANCE_TAKE_OVER: 8.0,
  VELOCITY_THRESHOLD: 0.01,
  VALUE_THRESHOLD: 0.001,
} as const;

export interface EdgeEffectSnapshot {
  distance: number;
  velocity: number;
  displacement: number;
  stretchVec: number;
  state: EdgeEffectState;
}

export class AospStretchEdgeEffect {
  private mState = EdgeEffectState.IDLE;
  private mDistance = 0;
  private mPullDistance = 0;
  private mVelocity = 0;
  private mDisplacement = 0.5;
  private mStartTimeMs = 0;
  private mWidth = 320;
  private mHeight = 160;

  setSize(width: number, height: number): void {
    this.mWidth = Math.max(1, width);
    this.mHeight = Math.max(1, height);
  }

  getDistance(): number {
    return this.mDistance;
  }

  isFinished(): boolean {
    return this.mState === EdgeEffectState.IDLE;
  }

  onPull(deltaDistance: number, displacement = 0.5): void {
    const now = performance.now();
    if (this.mState === EdgeEffectState.PULL_DECAY && now - this.mStartTimeMs < 167) {
      return;
    }
    if (this.mState !== EdgeEffectState.PULL) {
      this.mPullDistance = this.mDistance;
    }
    this.mState = EdgeEffectState.PULL;
    this.mStartTimeMs = now;
    this.mDisplacement = Math.max(0, Math.min(1, displacement));
    this.mPullDistance = Math.min(1, this.mPullDistance + deltaDistance);
    this.mDistance = Math.max(0, this.mPullDistance);
    this.mVelocity = 0;
    if (this.mDistance === 0) {
      this.mState = EdgeEffectState.IDLE;
    }
  }

  onPullDistance(deltaDistance: number, displacement = 0.5): number {
    const finalDistance = Math.max(0, deltaDistance + this.mDistance);
    const delta = finalDistance - this.mDistance;
    if (delta === 0 && this.mDistance === 0) {
      return 0;
    }
    if (this.mState !== EdgeEffectState.PULL && this.mDistance !== 0 && delta === 0) {
      return 0;
    }
    if (this.mState !== EdgeEffectState.PULL) {
      this.mPullDistance = this.mDistance;
    }
    this.onPull(delta, displacement);
    return delta;
  }

  onAbsorb(velocity: number): void {
    this.mState = EdgeEffectState.RECEDE;
    this.mStartTimeMs = performance.now();
    this.mVelocity =
      Math.max(100, Math.min(10000, Math.abs(velocity))) *
      EDGE_EFFECT_CONSTANTS.ON_ABSORB_VELOCITY_ADJUSTMENT *
      0.08;
    if (this.mDistance === 0) {
      this.mDistance = 0.002;
    }
  }

  onRelease(): void {
    this.mPullDistance = 0;
    if (this.mState !== EdgeEffectState.PULL && this.mState !== EdgeEffectState.ABSORB) {
      return;
    }
    this.mState = EdgeEffectState.RECEDE;
    this.mStartTimeMs = performance.now();
    this.mVelocity = 0;
  }

  static dampStretchVector(normalized: number): number {
    const sign = normalized >= 0 ? 1 : -1;
    const abs = Math.abs(normalized);
    const linearPart = EDGE_EFFECT_CONSTANTS.LINEAR_STRETCH_INTENSITY * abs;
    const expScale = Math.E / EDGE_EFFECT_CONSTANTS.SCROLL_DIST_AFFECTED_BY_EXP_STRETCH;
    const expPart =
      EDGE_EFFECT_CONSTANTS.EXP_STRETCH_INTENSITY * (1 - Math.exp(-abs * expScale));
    return sign * (linearPart + expPart);
  }

  getStretchVector(): number {
    return AospStretchEdgeEffect.dampStretchVector(Math.max(-1, Math.min(1, this.mDistance)));
  }

  update(nowMs = performance.now()): boolean {
    if (this.mState === EdgeEffectState.IDLE) return false;
    if (this.mState === EdgeEffectState.PULL) {
      return this.mDistance > 0;
    }

    const deltaT = (nowMs - this.mStartTimeMs) / 1000;
    if (deltaT < 0.001) return true;
    this.mStartTimeMs = nowMs;

    const {
      NATURAL_FREQUENCY: omega,
      DAMPING_RATIO: zeta,
      LINEAR_VELOCITY_TAKE_OVER: linearVelTakeOver,
      LINEAR_DISTANCE_TAKE_OVER: linearDistTakeOver,
      VELOCITY_THRESHOLD: velThreshold,
      VALUE_THRESHOLD: valThreshold,
    } = EDGE_EFFECT_CONSTANTS;

    const height = this.mHeight;
    if (
      Math.abs(this.mVelocity) <= linearVelTakeOver &&
      Math.abs(this.mDistance * height) < linearDistTakeOver &&
      Math.sign(this.mVelocity) === -Math.sign(this.mDistance)
    ) {
      this.mVelocity = Math.sign(this.mVelocity || -1) * linearVelTakeOver;
      const nextDist = this.mDistance + (this.mVelocity * deltaT) / height;
      if (Math.sign(nextDist) !== Math.sign(this.mDistance)) {
        this.mDistance = 0;
        this.mVelocity = 0;
        this.mState = EdgeEffectState.IDLE;
        return false;
      }
      this.mDistance = nextDist;
      return true;
    }

    const dampedFreq = omega * Math.sqrt(1 - zeta * zeta);
    const lastDisp = this.mDistance * height;
    const sinCoeff = (1 / dampedFreq) * (zeta * omega * lastDisp + this.mVelocity);
    const expTerm = Math.exp(-zeta * omega * deltaT);
    const cosVal = Math.cos(dampedFreq * deltaT);
    const sinVal = Math.sin(dampedFreq * deltaT);

    const newDisp = expTerm * (lastDisp * cosVal + sinCoeff * sinVal);
    const newVel =
      newDisp * -omega * zeta +
      expTerm * (-dampedFreq * lastDisp * sinVal + dampedFreq * sinCoeff * cosVal);

    this.mDistance = newDisp / height;
    this.mVelocity = newVel;

    if (this.mDistance > 1) {
      this.mDistance = 1;
      this.mVelocity = 0;
    }

    const pixelDist = this.mDistance * height;
    if (pixelDist <= 0 || (Math.abs(this.mVelocity) < velThreshold && pixelDist < valThreshold)) {
      this.mDistance = 0;
      this.mVelocity = 0;
      this.mState = EdgeEffectState.IDLE;
      return false;
    }
    return true;
  }

  snapshot(): EdgeEffectSnapshot {
    return {
      distance: this.mDistance,
      velocity: this.mVelocity,
      displacement: this.mDisplacement,
      stretchVec: this.getStretchVector(),
      state: this.mState,
    };
  }
}
