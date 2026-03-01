import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

import emojiCodePoints from '@unicode/unicode-17.0.0/Binary_Property/Emoji/code-points.js';
import unicodeNames from '@unicode/unicode-17.0.0/Names/index.js';

const require = createRequire(import.meta.url);

const SHORTCODE_SOURCE_PRIORITY = {
  direct_aliases: 6,
  discord: 5,
  emojibase: 4,
  unicode_names: 3,
  other_datasets: 2,
  synonyms: 1,
};

const DISCORD_SHORTCODE_FILES = ['discord', 'joypixels'];
const EMOJIBASE_SHORTCODE_FILES = ['emojibase', 'emojibase-native', 'emojibase-legacy'];
const OTHER_SHORTCODE_FILES = ['cldr', 'cldr-native', 'github', 'slack', 'iamcal'];

const DIRECT_SHORTCODE_ALIASES = {
  '+1': '👍',
  '-1': '👎',
  clapping: '👏',
  grin: '😁',
  heart: '❤️',
  laughing: '😆',
  ok_hand: '👌',
  pray: '🙏',
  rofl: '🤣',
  smile: '😄',
  smiley: '😃',
  sob: '😭',
  tada: '🎉',
  thumbsdown: '👎',
  thumbsup: '👍',
  wave: '👋',
};

const SHORTCODE_SYNONYMS = {
  grinning: 'grinning_face',
  heart_eyes: 'smiling_face_with_heart_shaped_eyes',
  joy: 'face_with_tears_of_joy',
  neutral_face: 'neutral_face',
  open_mouth: 'face_with_open_mouth',
  pensive: 'pensive_face',
  perspiring_face: 'anxious_face_with_sweat',
  scream: 'face_screaming_in_fear',
  simple_smile: 'slightly_smiling_face',
  thinking: 'thinking_face',
  thumbs_down: 'thumbs_down_sign',
  thumbs_up: 'thumbs_up_sign',
  worried: 'worried_face',
};

function normalizeShortcode(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_+\-\s]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

function normalizeUnicodeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

const shortcodeMap = new Map();
const emojiCodePointSet = new Set(emojiCodePoints);

function addShortcode(shortcode, unicode, priority) {
  if (!shortcode || !unicode) return;
  const normalized = normalizeShortcode(shortcode);
  if (!normalized) return;

  const existing = shortcodeMap.get(normalized);
  if (!existing || priority > existing.priority) {
    shortcodeMap.set(normalized, { unicode, priority });
  }
}

function decodeEmojibaseKeyToUnicode(key) {
  const parsed = key
    .split('-')
    .map((part) => Number.parseInt(part, 16))
    .filter(Number.isFinite);
  if (!parsed.length) return '';
  return String.fromCodePoint(...parsed);
}

function loadEmojibaseShortcodes(sources, priority) {
  for (const source of sources) {
    const modulePath = `emojibase-data/en/shortcodes/${source}.json`;
    let filePath = '';
    try {
      filePath = require.resolve(modulePath);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'MODULE_NOT_FOUND'
      ) {
        continue;
      }
      throw error;
    }

    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const [hexcode, rawAliases] of Object.entries(content)) {
      const unicode = decodeEmojibaseKeyToUnicode(hexcode);
      if (!unicode) continue;
      const aliases = Array.isArray(rawAliases) ? rawAliases : [rawAliases];
      for (const alias of aliases) {
        addShortcode(alias, unicode, priority);
      }
    }
  }
}

function loadEmojibaseAlternateNames(priority) {
  const filePath = require.resolve('emojibase-data/en/data.json');
  const entries = JSON.parse(readFileSync(filePath, 'utf8'));
  for (const entry of entries) {
    if (!entry?.emoji) continue;

    if (typeof entry.label === 'string') {
      addShortcode(entry.label, entry.emoji, priority);
    }

    if (Array.isArray(entry.tags)) {
      for (const tag of entry.tags) {
        addShortcode(tag, entry.emoji, priority);
      }
    }

    if (typeof entry.emoticon === 'string') {
      addShortcode(entry.emoticon, entry.emoji, priority);
    } else if (Array.isArray(entry.emoticon)) {
      for (const emoticon of entry.emoticon) {
        addShortcode(emoticon, entry.emoji, priority);
      }
    }
  }
}

loadEmojibaseShortcodes(DISCORD_SHORTCODE_FILES, SHORTCODE_SOURCE_PRIORITY.discord);
loadEmojibaseShortcodes(EMOJIBASE_SHORTCODE_FILES, SHORTCODE_SOURCE_PRIORITY.emojibase);

for (const codePoint of emojiCodePoints) {
  const name = unicodeNames.get(codePoint);
  if (!name) continue;

  const shortcode = normalizeUnicodeName(name);
  addShortcode(shortcode, String.fromCodePoint(codePoint), SHORTCODE_SOURCE_PRIORITY.unicode_names);
}

for (const [codePoint, name] of unicodeNames.entries()) {
  if (!emojiCodePointSet.has(codePoint)) continue;
  addShortcode(name, String.fromCodePoint(codePoint), SHORTCODE_SOURCE_PRIORITY.unicode_names);
}

loadEmojibaseShortcodes(OTHER_SHORTCODE_FILES, SHORTCODE_SOURCE_PRIORITY.other_datasets);
loadEmojibaseAlternateNames(SHORTCODE_SOURCE_PRIORITY.other_datasets);

for (const [alias, unicode] of Object.entries(DIRECT_SHORTCODE_ALIASES)) {
  addShortcode(alias, unicode, SHORTCODE_SOURCE_PRIORITY.direct_aliases);
}

for (const [alias, canonical] of Object.entries(SHORTCODE_SYNONYMS)) {
  const canonicalEntry = shortcodeMap.get(normalizeShortcode(canonical));
  if (canonicalEntry?.unicode) {
    addShortcode(alias, canonicalEntry.unicode, SHORTCODE_SOURCE_PRIORITY.synonyms);
  }
}

const sortedEntries = [...shortcodeMap.entries()]
  .map(([shortcode, entry]) => [shortcode, entry.unicode])
  .sort(([a], [b]) => a.localeCompare(b));
const objectLiteral = JSON.stringify(Object.fromEntries(sortedEntries), null, 2);

const output = `/* Auto-generated by scripts/generateEmojiMap.mjs */\nexport const EMOJI_SHORTCODE_MAP: Record<string, string> = ${objectLiteral};\n`;

const target = resolve('src/generated/emojiMap.ts');
writeFileSync(target, output, 'utf8');

console.log(`Generated ${sortedEntries.length} entries to ${target}`);
