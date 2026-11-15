/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class WorkshopAudioEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playLatheBeat(enabled: boolean, pitchScale = 1): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190 * pitchScale, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playSharpenHit(enabled: boolean, tier: 'perfect' | 'good' | 'miss'): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (tier === 'perfect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (tier === 'good') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(92, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playQaStamp(enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.07);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playTradeDispatch(enabled: boolean, isGold: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = isGold ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33];
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  private playSequence(
    enabled: boolean,
    notes: number[],
    type: OscillatorType,
    step: number,
    peak: number
  ): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(peak, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /** Combo ladder hit — rises with every tier so the streak is audible. */
  playComboMilestone(enabled: boolean, combo: number): void {
    const root = 392 * Math.pow(2, Math.min(4, Math.floor(combo / 10)) / 12);
    this.playSequence(enabled, [root, root * 1.25, root * 1.5], 'sine', 0.055, 0.085);
  }

  /** Achievement unlocked — a bright, settled major chord. */
  playAchievement(enabled: boolean): void {
    this.playSequence(enabled, [523.25, 659.25, 783.99, 1046.5], 'triangle', 0.07, 0.075);
  }

  /** Surprise event arrives — rising for good news, falling for trouble. */
  playEventAlert(enabled: boolean, tone: 'good' | 'bad' | 'neutral'): void {
    this.playSequence(
      enabled,
      tone === 'good' ? [440, 587.33] : [330, 246.94],
      'triangle',
      0.11,
      0.07
    );
  }

  /** Graphite dust burst — a short bright shimmer. */
  playDustBurst(enabled: boolean): void {
    this.playSequence(enabled, [784, 988, 1175, 1568], 'sine', 0.035, 0.06);
  }
}

export const workshopAudio = new WorkshopAudioEngine();

export function triggerHaptic(enabled: boolean, pattern: number | number[] = 12): void {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}
