import { EMOJI_SHORTCODE_MAP } from '@/generated/emojiMap';

function normalizeShortcode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_+\-\s]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

const SHORTCODE_TO_UNICODE = new Map<string, string>(
  Object.entries(EMOJI_SHORTCODE_MAP).map(([shortcode, unicode]) => [
    normalizeShortcode(shortcode),
    unicode,
  ]),
);

export function resolveEmojiShortcode(shortcode: string): string | undefined {
  if (!shortcode) return undefined;
  return SHORTCODE_TO_UNICODE.get(normalizeShortcode(shortcode));
}
