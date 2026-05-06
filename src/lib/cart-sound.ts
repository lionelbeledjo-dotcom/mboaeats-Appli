// Tiny WebAudio click feedback for cart actions.
// Controlled by localStorage flag "mboa_cart_sound" ("on" | "off"). Default: off.

const KEY = "mboa_cart_sound";
export const CART_SOUND_EVT = "mboa_cart_sound_changed";

// Lightweight dev-only logger. Stripped in production builds (import.meta.env.DEV === false).
const DEV =
  typeof import.meta !== "undefined" && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
function dlog(...args: unknown[]) {
  if (DEV) console.log("[cart-sound]", ...args);
}

export function isCartSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setCartSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
    window.dispatchEvent(new CustomEvent(CART_SOUND_EVT));
  } catch {}
  if (on) playCartSound("add"); // small confirmation
}

let ctx: AudioContext | null = null;
let unlocked = false;

function createCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function unlock() {
  const ac = createCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") ac.resume().catch(() => {});
    // Play a silent buffer — required on iOS Safari to unlock audio.
    const buffer = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(ac.destination);
    src.start(0);
    unlocked = true;
    removeUnlockListeners();
  } catch {}
}

function removeUnlockListeners() {
  if (typeof window === "undefined") return;
  window.removeEventListener("touchend", unlock);
  window.removeEventListener("touchstart", unlock);
  window.removeEventListener("click", unlock);
  window.removeEventListener("keydown", unlock);
}

if (typeof window !== "undefined") {
  window.addEventListener("touchend", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("click", unlock);
  window.addEventListener("keydown", unlock);
}

function getCtx(): AudioContext | null {
  if (!unlocked) return null; // Wait for a real user gesture (iOS requirement)
  const ac = createCtx();
  if (!ac) return null;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

export function playCartSound(kind: "add" | "remove") {
  if (!isCartSoundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    if (kind === "add") {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(990, now + 0.09);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.1);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch {}
}
