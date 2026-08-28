// Extremely subtle, generated-only interface sound. Nothing autoplays:
// the AudioContext is created lazily on first user enablement.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneNodes: Array<OscillatorNode> = [];
  enabled = false;

  enable() {
    this.enabled = true;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startDrone();
    }
    void this.ctx.resume();
  }

  disable() {
    this.enabled = false;
    if (this.ctx) void this.ctx.suspend();
  }

  private startDrone() {
    if (!this.ctx || !this.master) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 160;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.035;
    filter.connect(droneGain).connect(this.master);
    for (const f of [54, 54.4, 108.2]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start();
      this.droneNodes.push(osc);
    }
  }

  /** short soft blip for hovers / interactions */
  blip(freq = 880, dur = 0.09, vol = 0.02) {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** low knock for presses */
  thock() {
    this.blip(180, 0.16, 0.05);
  }
}

export const sound = new SoundEngine();
