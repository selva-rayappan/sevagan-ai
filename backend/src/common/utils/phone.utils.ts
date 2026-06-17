/**
 * Normalizes a phone number to standard format (digits only, prepended with 91 for Indian numbers).
 * E.g.,
 * '+91 98765 43210' -> '919876543210'
 * '9876543210' -> '919876543210'
 * '09876543210' -> '919876543210'
 * '919876543210' -> '919876543210'
 */
export function normalizePhone(phone: string): string {
  // Keep only digits
  const cleaned = phone.replace(/\D/g, '');

  // If it is 10 digits, prefix with '91'
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // If it is 11 digits starting with '0', strip '0' and prefix with '91'
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.substring(1)}`;
  }

  return cleaned;
}
