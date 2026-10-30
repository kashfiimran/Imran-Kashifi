import { RadioStation, RadioSynthesizer, StationInfo } from '../game/RadioSynthesizer.ts';

/**
 * AudioManager handles browser Web Audio API, routing master, music, and SFX
 * nodes while strictly observing the browser autoplay policy.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isUnlocked = false;

  // Sound generator nodes
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private radio: RadioSynthesizer = new RadioSynthesizer();

  public initialize(master = 80, music = 70, sfx = 85): void {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.setVolumes(master, music, sfx);

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Initialize radio synthesizer connected to music gain
    this.radio.initialize(this.ctx, this.musicGain);
  }

  public getRadio(): RadioSynthesizer {
    return this.radio;
  }

  public async unlock(): Promise<boolean> {
    if (!this.ctx) this.initialize();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.isUnlocked = true;
      } catch {
        return false;
      }
    } else {
      this.isUnlocked = true;
    }
    return this.isUnlocked;
  }

  public setVolumes(master: number, music: number, sfx: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, master / 100));
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, music / 100));
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, sfx / 100));
  }

  public playBeep(freq = 440, duration = 0.08, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.isUnlocked || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  public startEngineSound(): void {
    if (!this.ctx || !this.isUnlocked || !this.sfxGain || this.engineOsc) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low engine idle
      this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);
      this.engineOsc.start();
    } catch {}
  }

  public updateEnginePitch(speedRatio: number): void {
    if (!this.ctx || !this.engineOsc) return;
    try {
      const targetFreq = 55 + Math.min(200, Math.abs(speedRatio) * 120);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    } catch {}
  }

  public stopEngineSound(): void {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
  }

  public close(): void {
    this.stopEngineSound();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
