// Belt-and-braces "rest over" notification for when the phone is put down or the
// user has swapped to another app mid-rest. The shared audio beep (audio.js) is
// the primary cue; this adds an OS notification only when the tab is hidden and
// the user has granted permission. Entirely best-effort and opt-in — nothing
// happens unless permission was already granted.

/** Ask for notification permission once, from a user gesture (the Log tap). Only
 *  prompts when the choice hasn't been made yet, so it never nags. */
export function ensureNotifyPermission() {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* notifications unavailable */
  }
}

/** Fire a "rest over" notification, but only if permission is granted AND the
 *  page is currently hidden (backgrounded) — no point notifying what's on screen. */
export function notifyRestOver() {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    const body = { body: 'Time for your next set.', tag: 'leanbuild-rest', silent: false };
    navigator.serviceWorker?.getRegistration?.()
      .then((reg) => {
        if (reg?.showNotification) reg.showNotification('Rest over 💪', body);
        else new Notification('Rest over 💪', body);
      })
      .catch(() => {
        try { new Notification('Rest over 💪', body); } catch { /* ignore */ }
      });
  } catch {
    /* notifications unavailable */
  }
}
