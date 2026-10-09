/**
 * Sign content for the Learn guide, practice mode and call translation.
 *
 * Each sign has a `media` entry that says how it is taught:
 *  - { kind: 'handshape', shape }: an animated SVG hand (good for static handshapes
 *    like these demo gestures or the SASL fingerspelling alphabet)
 *  - { kind: 'video', src, poster }: a recording of a Deaf signer. Real SASL signs
 *    need this, because movement, location and facial expression carry meaning.
 *
 * Handshape fields: fingers are 'up' or 'curled'; thumb is 'out' | 'tucked' | 'up';
 * `rotate` turns the whole hand (degrees); `spread` fans the fingers; `wave` loops a wave.
 */

const FIST = { index: 'curled', middle: 'curled', ring: 'curled', pinky: 'curled' };

/** Phase-4 demo vocabulary, keyed by the MediaPipe gesture label it is recognised as. */
export const DEMO_VOCABULARY = {
  Open_Palm: {
    phrase: 'Hello',
    gesture: 'Open palm',
    hint: 'Open hand, palm facing the camera',
    media: { kind: 'handshape', shape: { index: 'up', middle: 'up', ring: 'up', pinky: 'up', thumb: 'out', spread: true, wave: true } },
    steps: ['Raise your hand to shoulder height.', 'Open all five fingers, palm towards the camera.', 'Hold still for half a second.'],
    tip: 'Keep your whole hand inside the camera frame, with space around your fingers.',
  },
  Thumb_Up: {
    phrase: 'Yes',
    gesture: 'Thumbs up',
    hint: 'Thumbs up',
    media: { kind: 'handshape', shape: { ...FIST, thumb: 'up' } },
    steps: ['Make a loose fist.', 'Point your thumb straight up.', 'Hold it in front of your chest.'],
    tip: 'Turn your knuckles slightly towards the camera so the thumb stands out.',
  },
  Thumb_Down: {
    phrase: 'No',
    gesture: 'Thumbs down',
    hint: 'Thumbs down',
    media: { kind: 'handshape', shape: { ...FIST, thumb: 'up', rotate: 180 } },
    steps: ['Make a loose fist.', 'Point your thumb straight down.', 'Hold it in front of your chest.'],
    tip: 'Keep your hand high enough that it doesn’t drop out of the frame.',
  },
  Pointing_Up: {
    phrase: 'Wait, one moment',
    gesture: 'Index finger up',
    hint: 'Index finger pointing up',
    media: { kind: 'handshape', shape: { ...FIST, index: 'up', thumb: 'tucked' } },
    steps: ['Make a fist.', 'Raise only your index finger, pointing up.', 'Keep your thumb folded in.'],
    tip: 'Hold your finger straight up. A sideways point reads as something else.',
  },
  Victory: {
    phrase: 'Thank you',
    gesture: 'Two fingers (V)',
    hint: 'Two fingers up (V shape)',
    media: { kind: 'handshape', shape: { ...FIST, index: 'up', middle: 'up', thumb: 'tucked', spread: true } },
    steps: ['Make a fist.', 'Raise your index and middle fingers.', 'Spread them apart into a V.'],
    tip: 'Show your palm to the camera with a clear gap between the two fingers.',
  },
  ILoveYou: {
    phrase: 'I love you',
    gesture: 'Thumb, index & pinky',
    hint: 'Thumb, index and pinky extended',
    media: { kind: 'handshape', shape: { index: 'up', middle: 'curled', ring: 'curled', pinky: 'up', thumb: 'out', spread: true } },
    steps: ['Open your hand, palm towards the camera.', 'Fold down your middle and ring fingers.', 'Keep your thumb, index and pinky out.'],
    tip: 'Fold the middle two fingers fully, or it looks like an open palm.',
  },
  Closed_Fist: {
    phrase: 'Stop',
    gesture: 'Closed fist',
    hint: 'Closed fist',
    media: { kind: 'handshape', shape: { ...FIST, thumb: 'tucked' } },
    steps: ['Curl all four fingers into your palm.', 'Wrap your thumb across the front.', 'Hold the fist towards the camera.'],
    tip: 'Show the front of the fist, not the side.',
  },
};

/** A relaxed, half-open hand: the animation's resting pose. */
export const REST_SHAPE = { index: 'up', middle: 'up', ring: 'up', pinky: 'up', thumb: 'tucked', relaxed: true };

/**
 * South African Sign Language modules planned for Phase 7. They'll be filled
 * with video recorded and checked by Deaf SASL signers.
 */
export const SASL_MODULES = [
  { id: 'fingerspelling', title: 'Fingerspelling A–Z', body: 'The SASL manual alphabet for names and words without a sign.', count: 26, media: 'Animated handshapes' },
  { id: 'greetings', title: 'Greetings', body: 'Hello, goodbye, good morning, how are you, and nice to meet you.', count: 10, media: 'Signer video' },
  { id: 'conversation', title: 'Everyday conversation', body: 'Yes, no, please, thank you, sorry, I understand, I don’t understand.', count: 12, media: 'Signer video' },
  { id: 'needs', title: 'Needs & emergencies', body: 'Water, food, bathroom, help, wait, doctor, and emergency.', count: 10, media: 'Signer video' },
];
