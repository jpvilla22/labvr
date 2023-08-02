/** Return the given number with leading zeros */
export function zeroPad(n: number, zeros: number): string {
  return String(n).padStart(zeros, '0');
}
