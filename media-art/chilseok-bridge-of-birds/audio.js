const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

function safeStop(node, when) {
  try { node.stop(when); } catch {}
}

export class GenerativeAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.droneGain = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.shimmerGain = null;
    this.shimmer = null;
    this.reverb = null;
    this.muted = false;
    this.started = false;
    this.previousTimeline = -0.001;
    this.fired = new Set();
    this.events = Object.freeze([
      [1.2, 'bell', 392.00],
      [8.0, 'bell', 523.25],
      [15.5, 'bell', 587.33],
      [21.0, 'wing', 0],
      [28.0, 'wing', 0],
      [35.0, 'bell', 659.25],
      [42.5, 'wing', 0],
      [45.0, 'chord', 0],
      [51.5, 'bell', 783.99],
      [57.2, 'bell', 523.25],
    ]);
  }

  async start() {
    if (!AudioContextCtor) return false;
    if (!this.context) this.createGraph();
    if (this.context.state === 'suspended') await this.context.resume();
    this.started = true;
    return true;
  }

  createGraph() {
    const context = new AudioContextCtor({ latencyHint: 'playback' });
    this.context = context;

    const master = context.createGain();
    master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = .025;
    compressor.release.value = .45;
    master.connect(compressor).connect(context.destination);
    this.master = master;

    const convolver = context.createConvolver();
    const impulseLength = Math.floor(context.sampleRate * 2.8);
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let filtered = 0;
      for (let i = 0; i < impulseLength; i++) {
        const decay = Math.pow(1 - i / impulseLength, 2.7);
        filtered = filtered * .62 + (Math.random() * 2 - 1) * .38;
        data[i] = filtered * decay * .45;
      }
    }
    convolver.buffer = impulse;
    const reverbReturn = context.createGain();
    reverbReturn.gain.value = .32;
    convolver.connect(reverbReturn).connect(master);
    this.reverb = convolver;

    const droneGain = context.createGain();
    droneGain.gain.value = .16;
    const droneFilter = context.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 310;
    droneFilter.Q.value = .55;
    droneGain.connect(droneFilter).connect(master);
    droneGain.connect(convolver);
    this.droneGain = droneGain;
    this.droneFilter = droneFilter;

    const droneFrequencies = [65.41, 98.00, 130.81];
    droneFrequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 1 ? -5 : index === 2 ? 7 : 0;
      const gain = context.createGain();
      gain.gain.value = index === 0 ? .58 : index === 1 ? .21 : .11;
      oscillator.connect(gain).connect(droneGain);
      oscillator.start();
    });

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < noiseData.length; i++) {
      brown = (brown + .018 * (Math.random() * 2 - 1)) / 1.018;
      noiseData[i] = brown * 3.1;
    }
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 480;
    noiseFilter.Q.value = .45;
    const noiseGain = context.createGain();
    noiseGain.gain.value = .012;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noiseGain.connect(convolver);
    noise.start();
    this.noiseFilter = noiseFilter;
    this.noiseGain = noiseGain;

    const shimmer = context.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 523.25;
    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0;
    shimmer.connect(shimmerGain).connect(master);
    shimmerGain.connect(convolver);
    shimmer.start();
    this.shimmer = shimmer;
    this.shimmerGain = shimmerGain;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : .34, now, .09);
  }

  resetTimeline() {
    this.previousTimeline = -0.001;
    this.fired.clear();
  }

  update(timelineTime, state) {
    if (!this.started || !this.context) return;
    const now = this.context.currentTime;
    const audible = this.muted ? 0 : .34;
    this.master.gain.setTargetAtTime(audible, now, .16);
    this.droneFilter.frequency.setTargetAtTime(310 + state.rift * 260 + state.seal * 420, now, .14);
    this.droneGain.gain.setTargetAtTime(.085 + state.window * .025 + state.rift * .045 + state.seal * .07, now, .17);
    this.noiseFilter.frequency.setTargetAtTime(620 + state.rift * 780 + state.lotus * 520, now, .12);
    this.noiseGain.gain.setTargetAtTime(.006 + state.rift * .018 + state.seal * .022, now, .14);
    this.shimmer.frequency.setTargetAtTime(523.25 + state.seal * 261.6 + Math.sin(timelineTime * .22) * 6, now, .18);
    this.shimmerGain.gain.setTargetAtTime(state.seal * .044 + state.lotus * .018, now, .20);

    if (timelineTime + .25 < this.previousTimeline) this.resetTimeline();
    for (let index = 0; index < this.events.length; index++) {
      const [time, type, value] = this.events[index];
      if (this.fired.has(index)) continue;
      if (timelineTime >= time && this.previousTimeline < time) {
        this.fired.add(index);
        if (type === 'bell') this.triggerBell(value);
        else if (type === 'low') this.triggerLowPulse(value);
        else if (type === 'wing') this.triggerWing();
        else if (type === 'chord') this.triggerChord();
      }
    }
    this.previousTimeline = timelineTime;
  }

  triggerBell(frequency = 523.25, gain = .10) {
    if (!this.context || this.muted) return;
    const context = this.context;
    const now = context.currentTime;
    [1, 2.01, 3.97].forEach((ratio, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency * ratio, now);
      oscillator.detune.setValueAtTime(index * 3, now);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(gain / (1 + index * 1.8), now + .014);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + 2.4 + index * .35);
      oscillator.connect(envelope).connect(this.master);
      envelope.connect(this.reverb);
      oscillator.start(now);
      safeStop(oscillator, now + 3.2);
    });
  }

  triggerLowPulse(frequency = 48) {
    if (!this.context || this.muted) return;
    const context = this.context;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency * 1.35, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, now + .65);
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.15, now + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 1.8);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    safeStop(oscillator, now + 2.0);
  }

  triggerWing() {
    if (!this.context || this.muted) return;
    const context = this.context;
    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * 1.1);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const phase = i / length;
      const envelope = Math.sin(Math.PI * phase) * Math.pow(1 - phase, .35);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(1300, now + .28);
    filter.frequency.exponentialRampToValueAtTime(420, now + .95);
    filter.Q.value = .55;
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.18, now + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 1.05);
    source.connect(filter).connect(gain).connect(this.master);
    gain.connect(this.reverb);
    source.start(now);
  }

  triggerChord() {
    [261.63, 329.63, 392.00, 493.88, 659.25].forEach((frequency, index) => {
      window.setTimeout(() => this.triggerBell(frequency, .065), index * 75);
    });
  }
}
