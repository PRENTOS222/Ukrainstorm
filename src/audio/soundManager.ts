/**
 * Procedural Web Audio Sound Synthesizer for Sky Shield Interceptor
 * Generates realistic aircraft, missile, machine gun, and Shahed drone audio without external asset dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private shahedGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private isEngineRunning = false;

  private shahedOsc: OscillatorNode | null = null;
  private shahedMod: OscillatorNode | null = null;
  private isShahedBuzzing = false;

  private isMuted = false;
  private lockToneOsc: OscillatorNode | null = null;
  private lockToneGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.shahedGain = this.ctx.createGain();
      this.shahedGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.shahedGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public init() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
    if (muted) {
      this.stopEngine();
      this.stopShahedBuzz();
      this.stopLockTone();
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Continuous Jet Engine Roar
   */
  public startEngine() {
    if (this.isMuted || this.isEngineRunning) return;
    this.initContext();
    if (!this.ctx || !this.engineGain) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(75, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Ignore audio start failures before gesture
    }
  }

  public updateEnginePitch(throttle: number, isBoosting: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.isEngineRunning) return;
    const baseFreq = isBoosting ? 140 : 75 + throttle * 40;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(isBoosting ? 0.35 : 0.15 + throttle * 0.1, this.ctx.currentTime, 0.1);
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    this.isEngineRunning = false;
  }

  /**
   * Shahed-136 characteristic 2-stroke lawnmower / moped engine buzzing
   */
  public updateShahedBuzz(nearestDistance: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.shahedGain) return;

    // nearestDistance: range ~ 100 to 1200
    if (nearestDistance > 1000) {
      if (this.isShahedBuzzing) this.stopShahedBuzz();
      return;
    }

    if (!this.isShahedBuzzing) {
      try {
        // Shahed uses a low frequency sawtooth buzz with motor oscillation
        this.shahedOsc = this.ctx.createOscillator();
        this.shahedOsc.type = 'sawtooth';
        this.shahedOsc.frequency.setValueAtTime(84, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);
        filter.Q.setValueAtTime(2, this.ctx.currentTime);

        this.shahedOsc.connect(filter);
        filter.connect(this.shahedGain);
        this.shahedOsc.start();
        this.isShahedBuzzing = true;
      } catch {}
    }

    if (this.shahedGain && this.ctx) {
      // Louder as drones get closer
      const proximity = Math.max(0, 1 - nearestDistance / 900);
      const targetGain = proximity * 0.25;
      this.shahedGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }
  }

  public stopShahedBuzz() {
    if (this.shahedOsc) {
      try {
        this.shahedOsc.stop();
        this.shahedOsc.disconnect();
      } catch {}
      this.shahedOsc = null;
    }
    this.isShahedBuzzing = false;
  }

  /**
   * 30mm Autocannon / Machine Gun Fire (GSh-30-1 / M61 Vulcan)
   */
  public playCannonShot(isNextGen = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Transient punch oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isNextGen) {
      // High-velocity plasma/railgun shot
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else {
      // Heavy 30mm kinetic autocannon
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);

    // Mechanical noise crack
    this.playNoiseCrack(0.05, 0.15);
  }

  private playNoiseCrack(duration: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /**
   * Air-to-Air Guided Missile Launch (AIM-9 / R-73)
   */
  public playMissileLaunch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Rocket booster igniter sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);

    this.playNoiseCrack(0.35, 0.25);
  }

  /**
   * Radar Seeker Lock-on Audio Tone (Intermittent searching -> Continuous lock)
   */
  public setLockStatus(isLocking: boolean, isLocked: boolean) {
    if (this.isMuted) {
      this.stopLockTone();
      return;
    }
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    if (!isLocking && !isLocked) {
      this.stopLockTone();
      return;
    }

    if (!this.lockToneOsc) {
      this.lockToneOsc = this.ctx.createOscillator();
      this.lockToneGain = this.ctx.createGain();
      this.lockToneOsc.type = 'square';
      this.lockToneOsc.connect(this.lockToneGain);
      this.lockToneGain.connect(this.sfxGain);
      this.lockToneOsc.start();
    }

    const now = this.ctx.currentTime;
    if (isLocked) {
      // Solid high-pitch lock tone
      this.lockToneOsc.frequency.setValueAtTime(1200, now);
      this.lockToneGain?.gain.setValueAtTime(0.18, now);
    } else if (isLocking) {
      // Beeping acquisition tone
      this.lockToneOsc.frequency.setValueAtTime(740, now);
      // Fast pulsed modulation
      const pulse = Math.sin(now * 30) > 0 ? 0.12 : 0;
      this.lockToneGain?.gain.setValueAtTime(pulse, now);
    }
  }

  public stopLockTone() {
    if (this.lockToneOsc) {
      try {
        this.lockToneOsc.stop();
        this.lockToneOsc.disconnect();
      } catch {}
      this.lockToneOsc = null;
    }
    if (this.lockToneGain) {
      try {
        this.lockToneGain.disconnect();
      } catch {}
      this.lockToneGain = null;
    }
  }

  /**
   * Drone / Missile Explosion
   */
  public playExplosion(isLarge = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const duration = isLarge ? 0.8 : 0.45;

    // Sub-bass detonation thump
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isLarge ? 130 : 160, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + duration);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(isLarge ? 0.6 : 0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + duration);

    // Fireball noise debris
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 700 : 950, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isLarge ? 0.5 : 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
  }

  /**
   * Countermeasure Flare ejection
   */
  public playFlares() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
    this.playNoiseCrack(0.12, 0.2);
  }

  /**
   * UI Chimes, Level Up & Upgrade Tones
   */
  public playLevelUp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  public playUpgradeBought() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playWarningSiren() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.25);
    osc.frequency.linearRampToValueAtTime(600, now + 0.5);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }
}

export const soundManager = new SoundManager();
