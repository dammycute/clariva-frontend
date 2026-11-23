/** Clariva pricing: ₦30,000 per term for every 50 students, counted in whole blocks of 50. */
export const PRICE_PER_BLOCK = 30000;
export const BLOCK_SIZE = 50;

/** How many blocks of 50 a school with this many students pays for. 51 students is 2 blocks. */
export function blocksFor(students: number): number {
  if (!Number.isFinite(students) || students < 1) return 0;
  return Math.ceil(students / BLOCK_SIZE);
}

export const pricePerTerm = (students: number): number => blocksFor(students) * PRICE_PER_BLOCK;

/** The student range a given number of blocks covers, for the price table. */
export const rangeFor = (blocks: number): [number, number] => [(blocks - 1) * BLOCK_SIZE + 1, blocks * BLOCK_SIZE];

export const naira = (n: number): string => `₦${n.toLocaleString('en-NG')}`;

export const WHATSAPP_NUMBER = '2347066752449';
export const WHATSAPP_DISPLAY = '0706 675 2449';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello, I would like to see a demo of Clariva for my school.')}`;
