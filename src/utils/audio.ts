type Note = `${'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'}${'b' | '#' | ''}${number}`;

export type OscillatorController = { oscillator: OscillatorNode; stop: () => void };

function noteToFreq(note: Note): number {
  const baseFreqs: any = {
    C: 65.41,
    'C#': 69.3,
    Db: 69.3,
    D: 73.42,
    'D#': 77.78,
    Eb: 77.78,
    E: 82.41,
    F: 87.31,
    'F#': 92.5,
    Gb: 92.5,
    G: 98.0,
    'G#': 103.83,
    Ab: 103.83,
    A: 110,
    'A#': 116.54,
    Bb: 116.54,
    B: 123.47,
  };

  const entry = note.match(/#|b/) ? note.slice(0, 2) : note[0];
  const initFreq = baseFreqs[entry];
  const octaveStep = parseInt(note.slice(-1)) - 2;

  return initFreq * 2 ** octaveStep;
}

/** Make a beep sound during a period of time
 *
 * @param freq Frequency of the beep. Either a number or a string representing the note and octave
 * @param millis Time the beep will last. If none is provided, the beep will continue until manually stopped
 * @returns The oscillator object. Useful to have if the beep needs to be stopped manually
 */
export function beep(freq: Note | number, millis?: number): OscillatorNode {
  var context = new AudioContext();
  var oscillator = context.createOscillator();
  oscillator.type = 'sine';

  if (typeof freq == 'number') oscillator.frequency.value = freq;
  else oscillator.frequency.value = noteToFreq(freq);

  oscillator.connect(context.destination);
  oscillator.start();

  if (millis != undefined) setTimeout(() => oscillator.stop(), millis);

  return oscillator;
}

export function intermitentBeep(freq: Note | number, beepMillis: number, silenceMillis: number): OscillatorController {
  var context = new AudioContext();
  var oscillator = context.createOscillator();
  oscillator.type = 'sine';

  if (typeof freq == 'number') var frequencyValue = freq;
  else frequencyValue = noteToFreq(freq);

  oscillator.frequency.value = frequencyValue;
  oscillator.connect(context.destination);
  oscillator.start();

  const period = beepMillis + silenceMillis;
  const beepInterval = setInterval(() => (oscillator.frequency.value = frequencyValue), period);

  var silenceInterval: NodeJS.Timer;
  setTimeout(() => {
    oscillator.frequency.value = 0;
    silenceInterval = setInterval(() => (oscillator.frequency.value = 0), period);
  }, beepMillis);

  return {
    oscillator,
    stop: () => {
      oscillator.stop();
      clearInterval(beepInterval);
      if (silenceInterval) clearInterval(silenceInterval);
    },
  };
}

export function reproduceAudio(id: string) {
  const audio = document.getElementById(id) as HTMLAudioElement;

  if (audio) audio.play();
  else console.error(`Audio with id ${id} not found`);
}
