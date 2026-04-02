export interface SoundSettings {
  enabled: boolean;
  volume: number;
  newOrderEnabled: boolean;
  orderReadyEnabled: boolean;
  takeawayReadyEnabled: boolean;
  rushAlertEnabled: boolean;
}

type SoundEventType = 'new_order' | 'order_ready' | 'takeaway_ready' | 'rush_alert';

const STORAGE_KEY = 'cloudpos_kitchen_sound_settings';

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  newOrderEnabled: true,
  orderReadyEnabled: true,
  takeawayReadyEnabled: true,
  rushAlertEnabled: true,
};

class KitchenSoundService {
  private audioContext: AudioContext | null = null;
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private initialized = false;
  private primed = false;
  private primingListenerAttached = false;

  constructor() {
    this.loadSettings();
    this.attachPrimingListener();
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  updateSettings(next: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...next };
    this.saveSettings();
  }

  async prime() {
    try {
      await this.ensureAudioContext();
      this.primed = true;
      this.detachPrimingListener();
    } catch {
      // Audio is best-effort. Browsers can still block until a later gesture.
    }
  }

  async testSound(type: SoundEventType) {
    await this.play(type);
  }

  async playNewOrderSound() {
    if (!this.settings.newOrderEnabled) return;
    await this.play('new_order');
  }

  async playOrderReadySound(orderType?: string) {
    if (orderType === 'takeout') {
      if (!this.settings.takeawayReadyEnabled) return;
      await this.play('takeaway_ready');
      return;
    }

    if (!this.settings.orderReadyEnabled) return;
    await this.play('order_ready');
  }

  async playRushAlert() {
    if (!this.settings.rushAlertEnabled) return;
    await this.play('rush_alert');
  }

  private async play(type: SoundEventType) {
    if (!this.settings.enabled) return;

    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    const sequence = this.getPattern(type);
    let offset = 0;

    for (const step of sequence) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = step.waveform;
      oscillator.frequency.value = step.frequency;
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const start = ctx.currentTime + offset;
      const peak = Math.max(0.02, step.duration * 0.18);
      const end = start + step.duration;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(this.settings.volume * step.volume, start + peak);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.start(start);
      oscillator.stop(end);

      offset += step.duration + step.gap;
    }
  }

  private getPattern(type: SoundEventType) {
    switch (type) {
      case 'new_order':
        return [
          { frequency: 880, duration: 0.12, gap: 0.03, volume: 0.4, waveform: 'sine' as const },
          { frequency: 1174, duration: 0.16, gap: 0.04, volume: 0.45, waveform: 'sine' as const },
        ];
      case 'order_ready':
        return [
          { frequency: 740, duration: 0.1, gap: 0.02, volume: 0.35, waveform: 'triangle' as const },
          { frequency: 988, duration: 0.1, gap: 0.02, volume: 0.38, waveform: 'triangle' as const },
          { frequency: 1318, duration: 0.16, gap: 0.05, volume: 0.42, waveform: 'triangle' as const },
        ];
      case 'takeaway_ready':
        return [
          { frequency: 523, duration: 0.08, gap: 0.02, volume: 0.38, waveform: 'square' as const },
          { frequency: 659, duration: 0.08, gap: 0.02, volume: 0.38, waveform: 'square' as const },
          { frequency: 784, duration: 0.14, gap: 0.04, volume: 0.4, waveform: 'square' as const },
        ];
      case 'rush_alert':
        return [
          { frequency: 440, duration: 0.08, gap: 0.02, volume: 0.45, waveform: 'sawtooth' as const },
          { frequency: 392, duration: 0.08, gap: 0.02, volume: 0.45, waveform: 'sawtooth' as const },
          { frequency: 440, duration: 0.12, gap: 0.05, volume: 0.48, waveform: 'sawtooth' as const },
        ];
    }
  }

  private async ensureAudioContext() {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioContext = new Ctx();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        return null;
      }
    }

    this.initialized = true;
    return this.audioContext;
  }

  private attachPrimingListener() {
    if (typeof window === 'undefined' || this.primingListenerAttached) return;

    const prime = () => {
      void this.prime();
    };

    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    this.primingListenerAttached = true;
  }

  private detachPrimingListener() {
    if (!this.primed) return;
    this.primingListenerAttached = false;
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore localStorage failures.
    }
  }
}

export const kitchenSoundService = new KitchenSoundService();
