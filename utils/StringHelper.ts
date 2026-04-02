import { DateHelper } from './DateHelper';

/**
 * StringHelper — String manipulation utilities used across page objects.
 */
export class StringHelper {
  /** Generate a random alphanumeric string of given length */
  static randomAlpha(length = 8): string {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  }

  /** Generate a unique identifier with optional prefix */
  static uniqueId(prefix = 'AUTO'): string {
    return `${prefix}_${DateHelper.epoch()}_${StringHelper.randomAlpha(4)}`;
  }

  /** Pad a number to a fixed width with leading zeros */
  static padNumber(num: number, width = 4): string {
    return String(num).padStart(width, '0');
  }

  /** Mask a string (e.g., password) for log output */
  static mask(value: string, visibleChars = 3): string {
    if (value.length <= visibleChars) return '*'.repeat(value.length);
    return value.substring(0, visibleChars) + '*'.repeat(value.length - visibleChars);
  }

  /** Trim and normalise whitespace in a string */
  static normalise(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  /** Convert camelCase to Title Case */
  static camelToTitle(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }
}

export default StringHelper;
