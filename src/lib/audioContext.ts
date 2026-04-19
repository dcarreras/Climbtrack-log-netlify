type WindowWithWebkitAudioContext = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function createAudioContext(): AudioContext | null {
  const AudioContextCtor =
    window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  return new AudioContextCtor();
}
