/**
 * RadioSynthesizer generates procedural legal radio stations using Web Audio API synthesis.
 */

export type RadioStation = 'synthwave' | 'westcoast' | 'lofi' | 'off';

export interface StationInfo {
  id: RadioStation;
  name: string;
  genre: string;
}

export const RADIO_STATIONS: StationInfo[] = [
  { id: 'synthwave', name: 'Radio Los Santos Wave', genre: 'Synthwave & Electro' },
  { id: 'westcoast', name: 'Pacific Coast Groove', genre: 'West Coast Funk' },
  { id: 'lofi', name: 'Vinewood Sunset FM', genre: 'Chillhop & Lo-Fi' },
  { id: 'off', name: 'Radio Off', genre: 'Silent' },
];

export class RadioSynthesizer {
  private ctx: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private currentStation: RadioStation = 'synthwave';
  private timerId: any = null;
  private step = 0;

  // Musical patterns
  private synthwaveNotes = [220, 261.63, 293.66, 329.63, 392.0, 440.0]; // Am scale
  private westcoastNotes = [146.83, 164.81, 196.0, 220.0, 246.94]; // Dm funk
  private lofiNotes = [174.61, 220.0, 261.63, 329.63, 349.23]; // Fmaj7

  public initialize(ctx: AudioContext, destination: GainNode): void {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.25;
    this.outputNode.connect(destination);
    this.startSequencer();
  }

  public setStation(station: RadioStation): void {
    this.currentStation = station;
  }

  public nextStation(): StationInfo {
    const idx = RADIO_STATIONS.findIndex((s) => s.id === this.currentStation);
    const nextIdx = (idx + 1) % RADIO_STATIONS.length;
    this.setStation(RADIO_STATIONS[nextIdx].id);
    return RADIO_STATIONS[nextIdx];
  }

  public getCurrentStationInfo(): StationInfo {
    return RADIO_STATIONS.find((s) => s.id === this.currentStation) || RADIO_STATIONS[0];
  }

  private startSequencer(): void {
    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(() => {
      if (!this.ctx || this.currentStation === 'off') return;

      this.step = (this.step + 1) % 16;
      const now = this.ctx.currentTime;

      if (this.currentStation === 'synthwave') {
        // 8th note bass arpeggio
        const note = this.synthwaveNotes[this.step % this.synthwaveNotes.length];
        this.playPluck(note, 0.18, 'sawtooth', 0.2);

        // Hi-hat on every 2nd step
        if (this.step % 2 === 0) {
          this.playNoise(0.04, 0.08);
        }
      } else if (this.currentStation === 'westcoast') {
        // Funky syncopated bass
        if (this.step % 4 === 0 || this.step === 7 || this.step === 10) {
          const note = this.westcoastNotes[this.step % this.westcoastNotes.length];
          this.playPluck(note, 0.25, 'triangle', 0.35);
        }
      } else if (this.currentStation === 'lofi') {
        // Slow warm chill chords on 4-beat measures
        if (this.step % 4 === 0) {
          const note = this.lofiNotes[(this.step / 4) % this.lofiNotes.length];
          this.playPluck(note, 0.6, 'sine', 0.2);
        }
      }
    }, 250); // 120 BPM 8th notes
  }

  private playPluck(freq: number, duration: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.outputNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  private playNoise(duration: number, vol: number): void {
    if (!this.ctx || !this.outputNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3000 + Math.random() * 2000, this.ctx.currentTime);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
