// Pemberitahuan saat giliran tiba: bunyi singkat + notifikasi browser (jika diizinkan)
export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.2);
    });
  } catch { /* audio tidak tersedia */ }
}

export function notify(title, body) {
  beep();
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
  } catch { /* abaikan */ }
}

export const canAskNotification = () => "Notification" in window && Notification.permission === "default";
export const askNotification = () => "Notification" in window && Notification.requestPermission();
