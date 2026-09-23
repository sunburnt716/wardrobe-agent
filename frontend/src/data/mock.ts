/**
 * Placeholder data, ported from the design prototypes (`Today.dc.html`,
 * `OtherScreens.dc.html`). This is the ONLY place fake data lives; the
 * `use*` hooks in this folder serve it and are the seam where the real
 * GraphQL layer plugs in later.
 */
import type {
  ChatMessage,
  ClosetFilter,
  ClosetItem,
  DetectedGarment,
  FitEntry,
  Garment,
  Outfit,
  WeatherContext,
  WeekDay,
} from './types';

// --- garment catalogue ------------------------------------------------
// One object per real-world garment, referenced across looks.

const g = (partial: Omit<Garment, 'photoKey'>): Garment => ({
  photoKey: null,
  ...partial,
});

/** Placeholder hotspot box: [x%, y%, w%, h%] within the 402×440 composite. */
const box = (
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number, number, number] => [x, y, w, h];

const trench = g({
  id: 'garment-trench',
  name: 'Stone trench',
  category: 'Outerwear',
  layer: 'outer',
  primaryColor: 'stone',
  wearsSinceWash: 5,
  washThreshold: 12,
  isClean: true,
  tintHint: '#d8cfc0',
  iconHint: 'coat-hanger',
});

const oxford = g({
  id: 'garment-oxford',
  name: 'White oxford',
  category: 'Top',
  layer: 'base',
  primaryColor: 'white',
  wearsSinceWash: 1,
  washThreshold: 2,
  isClean: true,
  tintHint: '#f4efe6',
  iconHint: 't-shirt',
});

const oatmealKnit = g({
  id: 'garment-oatmeal-knit',
  name: 'Oatmeal knit',
  category: 'Mid layer',
  layer: 'mid',
  primaryColor: 'oatmeal',
  wearsSinceWash: 3,
  washThreshold: 3,
  isClean: false,
  tintHint: '#e2d3b7',
  iconHint: 'hoodie',
});

const woolTrousers = g({
  id: 'garment-wool-trousers',
  name: 'Charcoal wool trousers',
  category: 'Bottom',
  layer: 'bottom',
  primaryColor: 'charcoal',
  wearsSinceWash: 4,
  washThreshold: 8,
  isClean: true,
  tintHint: '#5b5b5f',
  iconHint: 'pants',
});

const navyTee = g({
  id: 'garment-navy-tee',
  name: 'Navy tee',
  category: 'Base',
  layer: 'base',
  primaryColor: 'navy',
  wearsSinceWash: 4,
  washThreshold: 4,
  isClean: false,
  tintHint: '#33405c',
  iconHint: 't-shirt',
});

const indigoJeans = g({
  id: 'garment-indigo-jeans',
  name: 'Indigo straight jeans',
  category: 'Bottom',
  layer: 'bottom',
  primaryColor: 'indigo',
  wearsSinceWash: 6,
  washThreshold: 10,
  isClean: true,
  tintHint: '#43537d',
  iconHint: 'pants',
});

const charcoalKnit = g({
  id: 'garment-charcoal-knit',
  name: 'Charcoal knit',
  category: 'Mid layer',
  layer: 'mid',
  primaryColor: 'charcoal',
  wearsSinceWash: 1,
  washThreshold: 3,
  isClean: true,
  tintHint: '#4e4e52',
  iconHint: 'hoodie',
});

const whiteSneakers = g({
  id: 'garment-white-sneakers',
  name: 'White sneakers',
  category: 'Shoes',
  layer: 'footwear',
  primaryColor: 'white',
  wearsSinceWash: 9,
  washThreshold: 12,
  isClean: false,
  tintHint: '#f2efe9',
  iconHint: 'sneaker',
});

// --- Today: the three proposed looks --------------------------------

export const MOCK_WEATHER: WeatherContext = {
  label: '18° · rain by 4',
  icon: 'cloud-rain',
};

export const MOCK_PROPOSALS: Outfit[] = [
  {
    id: 'outfit-1',
    status: 'PROPOSED',
    title: 'Rain-ready',
    metaLine: 'Three layers, smart enough',
    accentColor: null,
    washColorA: '#e7dcc6',
    washColorB: '#cfd8d2',
    compositeImageKey: null,
    pieces: [
      {
        garment: trench,
        verdict: null,
        rationale:
          'Cotton gabardine. Worn 5 times since its last wash, which is nothing for a coat.',
        chips: [
          { icon: 'drop', label: 'Handles rain' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(9.9, 11.8, 23.9, 36.4),
      },
      {
        garment: oxford,
        verdict: null,
        rationale:
          'Cotton poplin. One wear since washing, so it has one more in it before the basket.',
        chips: [
          { icon: 'briefcase', label: 'Smart' },
          { icon: 'thermometer-simple', label: 'Light' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(36.1, 6.4, 28.3, 19.5),
      },
      {
        garment: oatmealKnit,
        verdict: null,
        rationale:
          'Lambswool, three wears in. Comes off indoors and the shirt still reads finished on its own.',
        chips: [
          { icon: 'thermometer-simple', label: 'Warm' },
          { icon: 'couch', label: 'Casual' },
          { icon: 'washing-machine', label: 'Due a wash', tone: 'warn' },
        ],
        box: box(35.1, 29.5, 33.8, 21.4),
      },
      {
        garment: woolTrousers,
        verdict: null,
        rationale:
          "Your workhorse — four wears of eight. Worsted wool, so a wet walk home won't mark them.",
        chips: [
          { icon: 'briefcase', label: 'Professional' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(34.6, 55, 18.9, 34.1),
      },
    ],
  },
  {
    id: 'outfit-2',
    status: 'PROPOSED',
    title: 'Off-duty indigo',
    metaLine: 'Two layers, nothing to iron',
    accentColor: null,
    washColorA: '#dde2ef',
    washColorB: '#c8d2ea',
    compositeImageKey: null,
    pieces: [
      {
        garment: trench,
        verdict: null,
        rationale:
          "Same coat, looser company. It's the only thing you own that covers a shower properly.",
        chips: [
          { icon: 'drop', label: 'Handles rain' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(10.4, 11.8, 23.9, 36.4),
      },
      {
        garment: navyTee,
        verdict: null,
        rationale:
          'Heavy jersey. Cheapest warmth you own under a knit, and nobody can see it.',
        chips: [
          { icon: 'thermometer-simple', label: 'Summer weight' },
          { icon: 'couch', label: 'Casual' },
          { icon: 'washing-machine', label: 'Due a wash', tone: 'warn' },
        ],
        box: box(36.6, 13.2, 27.3, 17.3),
      },
      {
        garment: oatmealKnit,
        verdict: null,
        rationale:
          'Third wear. Soft against indigo, which is why this pairing keeps coming back.',
        chips: [
          { icon: 'thermometer-simple', label: 'Warm' },
          { icon: 'couch', label: 'Casual' },
          { icon: 'washing-machine', label: 'Due a wash', tone: 'warn' },
        ],
        box: box(36.1, 31.6, 33.8, 21.4),
      },
      {
        garment: indigoJeans,
        verdict: null,
        rationale:
          'Rigid denim, six wears of ten. Dries slowly, so fine for a shower and not a downpour.',
        chips: [
          { icon: 'couch', label: 'Casual' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(35.6, 56.8, 18.9, 33.7),
      },
    ],
  },
  {
    id: 'outfit-3',
    status: 'PROPOSED',
    title: 'All charcoal',
    metaLine: 'One colour, top to bottom',
    accentColor: null,
    washColorA: '#ddd9d4',
    washColorB: '#c6c3c0',
    compositeImageKey: null,
    pieces: [
      {
        garment: trench,
        verdict: null,
        rationale:
          'The only light thing in the outfit, which is the point — it lifts the charcoal.',
        chips: [
          { icon: 'drop', label: 'Handles rain' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(9.9, 11.8, 23.9, 36.4),
      },
      {
        garment: charcoalKnit,
        verdict: null,
        rationale:
          'Lambswool, straight over a tee. One value from neck to ankle reads deliberate, not lazy.',
        chips: [
          { icon: 'thermometer-simple', label: 'Warm' },
          { icon: 'couch', label: 'Casual' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(35.1, 15.5, 31.8, 21.3),
      },
      {
        garment: woolTrousers,
        verdict: null,
        rationale:
          'Four wears of eight. Matching the knit is what makes this the quickest look you own.',
        chips: [
          { icon: 'briefcase', label: 'Professional' },
          { icon: 'thermometer-simple', label: 'Middling' },
          { icon: 'sparkle', label: 'Clean' },
        ],
        box: box(35.6, 48.9, 18.9, 31.1),
      },
      {
        garment: whiteSneakers,
        verdict: null,
        rationale:
          "Canvas, nine wears of twelve. They break the charcoal — but they'll soak through in rain.",
        chips: [
          { icon: 'couch', label: 'Casual' },
          { icon: 'thermometer-simple', label: 'Light' },
          { icon: 'washing-machine', label: 'Due a wash', tone: 'warn' },
        ],
        box: box(37.3, 83.6, 25.4, 6.9),
      },
    ],
  },
];

// --- Closet ---------------------------------------------------------

export const MOCK_CLOSET_FILTERS: ClosetFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'tops', label: 'Tops' },
  { id: 'knitwear', label: 'Knitwear' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
];

export const MOCK_CLOSET: ClosetItem[] = [
  { ...oatmealKnit, category: 'Knit', slotHeight: 140 },
  { ...oxford, name: 'White oxford', category: 'Shirt', slotHeight: 112 },
  { ...trench, category: 'Coat', slotHeight: 168 },
  { ...woolTrousers, name: 'Charcoal trousers', category: 'Wool', slotHeight: 120 },
  { ...indigoJeans, name: 'Indigo jeans', category: 'Denim', slotHeight: 146 },
  { ...whiteSneakers, category: 'Canvas', slotHeight: 104 },
  { ...navyTee, category: 'Jersey', slotHeight: 126 },
];

export const MOCK_CLOSET_WASH_COUNT = 3;

// --- Ask ----------------------------------------------------------

export const MOCK_CHAT: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    text: "Dinner tonight, somewhere nice. It's raining.",
  },
  {
    id: 'msg-2',
    role: 'agent',
    text: 'Wear the navy tee under the oatmeal knit with the wool trousers. The trench covers the walk.',
    lookCard: {
      outfitId: 'outfit-2',
      name: 'Dinner, indigo',
      pieceCount: 3,
      tintHint: '#c8d2ea',
    },
  },
];

export const MOCK_SUGGESTIONS = [
  'Something warmer',
  'Swap the knit',
  'Show me all-black',
];

/** A canned agent reply used until Ask is wired to the backend. */
export const MOCK_CANNED_REPLY: ChatMessage = {
  id: 'msg-canned',
  role: 'agent',
  text: "Here's a warmer version — swap the oxford for the charcoal knit and keep the trench.",
};

// --- Fits ------------------------------------------------------------

export const MOCK_WEEK: WeekDay[] = [
  { day: 'M', date: '28', state: 'worn' },
  { day: 'T', date: '29', state: 'worn' },
  { day: 'W', date: '30', state: 'worn' },
  { day: 'T', date: '31', state: 'worn' },
  { day: 'F', date: '1', state: 'today' },
  { day: 'S', date: '2', state: 'future' },
  { day: 'S', date: '3', state: 'future' },
];

export const MOCK_FITS: FitEntry[] = [
  {
    id: 'fit-1',
    outfitId: 'outfit-1',
    when: 'Yesterday · Mon',
    name: 'Rain-ready',
    tintHint: '#e7dcc6',
    weather: '17° wet',
    verdict: { label: 'Loved it', icon: 'heart', tone: 'positive' },
  },
  {
    id: 'fit-2',
    outfitId: 'outfit-2',
    when: 'Sat 30 Aug',
    name: 'Off-duty indigo',
    tintHint: '#dde2ef',
    weather: '21° clear',
    verdict: { label: 'Fine', icon: 'check', tone: 'neutral' },
  },
  {
    id: 'fit-3',
    outfitId: 'outfit-3',
    when: 'Fri 29 Aug',
    name: 'All charcoal',
    tintHint: '#ddd9d4',
    weather: '19° grey',
    verdict: { label: 'Too warm', icon: 'thumbs-down', tone: 'negative' },
  },
];

export const MOCK_WORN_DAY_COUNT = 6;

// --- Add ------------------------------------------------------------

export const MOCK_DETECTED: DetectedGarment = {
  name: 'Oatmeal crewneck',
  confidenceLabel: 'Knitwear · 92%',
  waterResistant: true,
  chips: [
    { icon: 'palette', label: 'Oatmeal' },
    { icon: 'thermometer-simple', label: 'Warm' },
    { icon: 'couch', label: 'Casual' },
    { icon: 'scissors', label: 'Lambswool' },
  ],
};

// --- shared: today's dateline -------------------------------------

export const MOCK_TODAY_DATE = 'Tue 1 Sep';
