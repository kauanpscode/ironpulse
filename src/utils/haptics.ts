import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

interface MinimalOscillator {
  type: string;
  frequency: { setValueAtTime(value: number, startTime: number): void };
  connect(destination: unknown): void;
  start(): void;
  stop(when: number): void;
}

interface MinimalGain {
  gain: { setValueAtTime(value: number, startTime: number): void };
  connect(destination: unknown): void;
}

interface MinimalAudioContext {
  currentTime: number;
  destination: unknown;
  createOscillator(): MinimalOscillator;
  createGain(): MinimalGain;
}

export async function hapticLight(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Fallback silent on unsupported devices
  }
}

export async function hapticMedium(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Ignore
  }
}

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignore
  }
}

export async function hapticWarning(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Ignore
  }
}

export async function triggerRestTimerCompleteAlert(): Promise<void> {
  if (Platform.OS === 'web') {
    playWebBeep();
    return;
  }
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate([0, 220, 120, 260]);
  } catch {
    // Ignore on simulator
  }
}

function playWebBeep(): void {
  try {
    const scope = globalThis as {
      AudioContext?: new () => MinimalAudioContext;
    };
    const AudioCtx = scope.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio errors
  }
}
