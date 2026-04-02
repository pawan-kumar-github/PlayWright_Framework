/**
 * DateHelper — Date/time utilities used across page objects and test data.
 */
export class DateHelper {
  /** Returns current date in YYYY-MM-DD format */
  static today(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** Returns date N days from today in YYYY-MM-DD */
  static offsetDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /** Returns current timestamp in YYYY-MM-DD HH:mm:ss */
  static timestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /** Returns epoch milliseconds as string — useful for unique suffixes */
  static epoch(): string {
    return String(Date.now());
  }

  /** Format a Date object to MM/DD/YYYY (US format) */
  static toUSFormat(date: Date = new Date()): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  /** Parse a YYYY-MM-DD string to a Date object */
  static parse(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  /** Check if dateA is before dateB */
  static isBefore(dateA: string, dateB: string): boolean {
    return new Date(dateA) < new Date(dateB);
  }
}

export default DateHelper;
