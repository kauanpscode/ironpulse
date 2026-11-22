/**
 * Offline-safe UUID v4 generator without native crypto dependency requirements.
 */
export function generateId(): string {
  const hex = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      result += '-';
    } else if (i === 14) {
      result += '4';
    } else if (i === 19) {
      const r = Math.floor(Math.random() * 16);
      result += hex[(r & 0x3) | 0x8];
    } else {
      result += hex[Math.floor(Math.random() * 16)];
    }
  }
  return result;
}
