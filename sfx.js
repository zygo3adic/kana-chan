// UI sounds ported from miladycraftviewer's sfx.js (itself from remistats.net):
// every sound is synthesised with oscillators, no audio files.
if (!window.__kanaSfx) {
let ctx = null;
let compressor = null;
let reverb = null;
let echo = null;

/* A short burst of noise decaying to silence, used as the convolver's impulse
   response — cheaper than shipping an impulse file and enough to stop these
   sounding completely dry. */
function impulseResponse(context) {
  const length = Math.floor(context.sampleRate * 0.18);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3) * 0.6;
    }
  }
  return buffer;
}

/* Built on first use rather than at load: an AudioContext created before any
   interaction just sits suspended, and browsers warn about it. */
async function ready() {
  if (typeof window === "undefined") return false;

  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    reverb = ctx.createConvolver();
    reverb.buffer = impulseResponse(ctx);

    echo = ctx.createDelay(0.5);
    echo.delayTime.value = 0.12;

    reverb.connect(compressor);
    echo.connect(compressor);
    compressor.connect(ctx.destination);
  }

  // Autoplay rules leave it suspended until a gesture; every caller here is
  // one, so this resolves on the first click.
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

const osc = (freq, type = "sine") => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
};

const gain = (value = 1) => {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
};

const route = (node, { withReverb = true, withDelay = false } = {}) => {
  node.connect(compressor);
  if (withReverb) node.connect(reverb);
  if (withDelay) node.connect(echo);
};

/* A run of notes sharing one output gain — the shape behind the panel and
   success sounds. `peak`, `hold` and `tail` are per note. */
function arpeggio(notes, { master, step, attack, peak, hold = 0, tail, stop }) {
  const t = ctx.currentTime;
  const out = gain(master);
  route(out, { withReverb: true });

  notes.forEach((freq, i) => {
    const at = t + i * step;
    const o = osc(freq, "sine");
    const g = gain(0);

    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    if (hold) g.gain.setValueAtTime(peak, at + hold);
    // Exponential ramps can't reach zero, hence 0.001.
    g.gain.exponentialRampToValueAtTime(0.001, at + tail);

    o.connect(g);
    g.connect(out);
    o.start(at);
    o.stop(at + stop);
  });
}

/* Two blips a third apart — the workhorse button sound.

   Softened from the reference, which used square waves gated on and off with
   setValueAtTime. Square is buzzy to begin with, and switching a waveform on
   at full amplitude is a step discontinuity, which is literally a click on top
   of the intended one. Triangle carries far less high harmonic content, and a
   few milliseconds of attack plus an exponential tail removes the edge at both
   ends. Same two notes and spacing, so it still reads as the same sound. */
function click() {
  const t = ctx.currentTime;
  [[523.25, t], [659.25, t + 0.05]].forEach(([freq, at]) => {
    const o = osc(freq, "triangle");
    const g = gain(0);

    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.07, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.07);

    o.connect(g);
    route(g, { withReverb: true });
    o.start(at);
    o.stop(at + 0.08);
  });
}

/* Hover, straight from the reference: a soft triangle blip that walks through
   four notes so sweeping across a row plays a little run rather than the same
   note over and over. The walk resets once the pointer has been still for a
   second, so each new sweep starts from the root. */
const HOVER_STEPS = [0, 2, -2, 5];
let hoverStep = 0;
let hoverAt = 0;

function hover() {
  const now = Date.now();
  hoverStep = now - hoverAt > 1000 ? 0 : (hoverStep + 1) % HOVER_STEPS.length;
  hoverAt = now;

  const t = ctx.currentTime;
  const freq = 440 * Math.pow(2, HOVER_STEPS[hoverStep] / 12);
  const o = osc(freq, "triangle");
  const g = gain(0);

  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

  o.connect(g);
  route(g, { withReverb: true });
  o.start(t);
  o.stop(t + 0.17);
}

// Rising major arpeggio for a panel appearing, falling for it going away.
const menuOpen = () =>
  arpeggio([261.63, 329.63, 392, 523.25], {
    master: 0.25, step: 0.03, attack: 0.02, peak: 0.08, tail: 0.25, stop: 0.3,
  });

const menuClose = () =>
  arpeggio([523.25, 392, 329.63, 261.63], {
    master: 0.2, step: 0.02, attack: 0.005, peak: 0.08, tail: 0.15, stop: 0.2,
  });

// Same shape an octave up, slower, with a hold so it rings rather than blips.
const success = () =>
  arpeggio([523.25, 659.25, 783.99, 1046.5], {
    master: 0.3, step: 0.05, attack: 0.02, peak: 0.1, hold: 0.1, tail: 0.4, stop: 0.5,
  });

// Two detuned saws through a low filter — deliberately unmusical.
function error() {
  const t = ctx.currentTime;
  const a = osc(200, "sawtooth");
  const b = osc(150, "sawtooth");

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;
  filter.Q.value = 5;

  const out = gain(0.15);
  a.connect(filter);
  b.connect(filter);
  filter.connect(out);
  route(out, { withReverb: false });

  out.gain.setValueAtTime(0.15, t);
  out.gain.linearRampToValueAtTime(0, t + 0.1);
  out.gain.setValueAtTime(0.1, t + 0.12);
  out.gain.linearRampToValueAtTime(0, t + 0.2);

  a.start(t);
  a.stop(t + 0.2);
  b.start(t);
  b.stop(t + 0.2);
}

// A quick sweep up and part-way back, for moving between things.
function transition() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(800, t + 0.1);
  o.frequency.exponentialRampToValueAtTime(400, t + 0.2);

  const g = gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

  o.connect(g);
  route(g, { withReverb: false, withDelay: true });
  o.start(t);
  o.stop(t + 0.3);
}

const SOUNDS = {
  CLICK: click,
  HOVER: hover,
  MENU_OPEN: menuOpen,
  MENU_CLOSE: menuClose,
  SUCCESS: success,
  ERROR: error,
  TRANSITION: transition,
};

/* Hover fires per element entered, so a quick sweep would otherwise stack a
   dozen voices at once. Checked before awaiting the context, so a throttled
   hover costs nothing at all. */
const THROTTLE_MS = { HOVER: 100 };
const lastPlayed = new Map();

function throttled(name) {
  const ms = THROTTLE_MS[name];
  if (!ms) return false;
  const now = Date.now();
  if (now - (lastPlayed.get(name) || 0) < ms) return true;
  lastPlayed.set(name, now);
  return false;
}

/* Fire-and-forget: nothing here is worth interrupting the interaction that
   triggered it, so a browser that refuses to play just stays quiet. */
async function playSound(name) {
  const make = SOUNDS[name];
  if (!make || throttled(name)) return;
  try {
    if (await ready()) make();
  } catch {
    /* no sound is not an error worth surfacing */
  }
}


window.__kanaSfx = playSound;
}
