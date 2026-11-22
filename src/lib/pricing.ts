/** Clariva pricing: ₦30,000 per term for each block of 50 students. */
export const PRICE_PER_BLOCK = 30000;
export const BLOCK_SIZE = 50;
/** A school can be this many students over its last block at no extra cost (110 students = 2 blocks). */
export const BUFFER = 10;

/** How many blocks of 50 a school with this many students pays for. */
export function blocksFor(students: number): number {
  if (!Number.isFinite(students) || students < 1) return 0;
  return Math.max(1, Math.ceil((students - BUFFER) / BLOCK_SIZE));
}

export const pricePerTerm = (students: number): number => blocksFor(students) * PRICE_PER_BLOCK;

/** The student range a given number of blocks covers, for the price table. */
export const rangeFor = (blocks: number): [number, number] => [blocks === 1 ? 1 : (blocks - 1) * BLOCK_SIZE + BUFFER + 1, blocks * BLOCK_SIZE + BUFFER];

export const naira = (n: number): string => `₦${n.toLocaleString('en-NG')}`;

export const WHATSAPP_NUMBER = '2347066752449';
export const WHATSAPP_DISPLAY = '0706 675 2449';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello, I would like to see a demo of Clariva for my school.')}`;
