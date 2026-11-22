import { describe, it, expect } from 'vitest';
import { blocksFor, pricePerTerm, rangeFor, naira, WHATSAPP_LINK } from '@/lib/pricing';

describe('pricing', () => {
  it('charges one block up to 60 students (50 plus the buffer of 10)', () => {
    for (const n of [1, 30, 50, 60]) expect(pricePerTerm(n)).toBe(30000);
  });

  it('moves to the next block at 61 and keeps the buffer on every block', () => {
    expect(blocksFor(61)).toBe(2);
    expect(blocksFor(110)).toBe(2);       // the owner's example: 110 students still costs two blocks
    expect(pricePerTerm(110)).toBe(60000);
    expect(blocksFor(111)).toBe(3);
    expect(pricePerTerm(250)).toBe(150000);
  });

  it('is zero for no or invalid input', () => {
    for (const n of [0, -5, NaN]) expect(pricePerTerm(n)).toBe(0);
  });

  it('describes the range each block covers', () => {
    expect(rangeFor(1)).toEqual([1, 60]);
    expect(rangeFor(2)).toEqual([61, 110]);
    expect(rangeFor(3)).toEqual([111, 160]);
  });

  it('formats naira and builds the WhatsApp link', () => {
    expect(naira(30000)).toBe('₦30,000');
    expect(WHATSAPP_LINK).toContain('https://wa.me/2347066752449?text=');
  });
});
