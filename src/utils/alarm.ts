// Alarma sonora del temporizador vía Web Audio.
// El AudioContext debe crearse tras un gesto del usuario (política de iOS),
// por eso unlockAudio() se llama desde el click que arranca el temporizador.

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // sin audio — la alarma visual (toast) sigue funcionando
  }
}

export function playAlarm(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.3;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  } catch {
    // silencioso
  }
}
