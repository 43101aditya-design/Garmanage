/**
 * IntelliGarage Global Formatting Utilities.
 * Standardizes Indian Rupee currency (₹), date/time, and number formatting across all portals.
 */

export interface FormatIROptions {
  includeDecimals?: boolean;
  compact?: boolean;
}

/**
 * Formats a numeric value in Indian Rupee format (e.g., ₹1,25,000 or ₹45,500.50, or compact ₹1.5L).
 */
export function formatINR(
  amount: number | string | null | undefined, 
  optionsOrDecimals: boolean | FormatIROptions = false
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }

  const options: FormatIROptions = typeof optionsOrDecimals === 'boolean' 
    ? { includeDecimals: optionsOrDecimals } 
    : (optionsOrDecimals || {});

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (options.compact) {
    if (absNum >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(absNum / 10000000).toFixed(1)}Cr`;
    }
    if (absNum >= 100000) {
      return `${isNegative ? '-' : ''}₹${(absNum / 100000).toFixed(1)}L`;
    }
    if (absNum >= 1000) {
      return `${isNegative ? '-' : ''}₹${(absNum / 1000).toFixed(1)}k`;
    }
    return `${isNegative ? '-' : ''}₹${absNum}`;
  }

  const formatted = absNum.toLocaleString('en-IN', {
    maximumFractionDigits: options.includeDecimals ? 2 : 0,
    minimumFractionDigits: options.includeDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Formats a date into a clean human-readable string (e.g. 15 Sep 2026).
 */
export function formatDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

/**
 * Formats date and time (e.g. 15 Sep 2026, 02:30 PM).
 */
export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

/**
 * Formats numbers with standard Indian thousands separator (e.g. 1,50,000).
 */
export function formatNumberIN(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }
  return Number(value).toLocaleString('en-IN');
}
