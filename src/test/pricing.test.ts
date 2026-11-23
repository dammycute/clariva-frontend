import { describe, it, expect } from 'vitest';
import { blocksFor, pricePerTerm, rangeFor, naira, WHATSAPP_LINK } from '@/lib/pricing';

describe('pricing', () => {
  it('charges one block for 1 to 50 students', () => {
    for (const n of [1, 30, 50]) expect(pricePerTerm(n)).toBe(30000);
  });

  it('starts the next block at 51, with no buffer', () => {
    expect(blocksFor(51)).toBe(2);
    expect(pricePerTerm(60)).toBe(60000);
    expect(pricePerTerm(100)).toBe(60000);
    expect(pricePerTerm(101)).toBe(90000);
    expect(pricePerTerm(110)).toBe(90000);
    expect(pricePerTerm(250)).toBe(150000);
  });

  it('is zero for no or invalid input', () => {
    for (const n of [0, -5, NaN]) expect(pricePerTerm(n)).toBe(0);
  });

  it('describes the range each block covers', () => {
    expect(rangeFor(1)).toEqual([1, 50]);
    expect(rangeFor(2)).toEqual([51, 100]);
    expect(rangeFor(3)).toEqual([101, 150]);
  });

  it('formats naira and builds the WhatsApp link', () => {
    expect(naira(30000)).toBe('₦30,000');
    expect(WHATSAPP_LINK).toContain('https://wa.me/2347066752449?text=');
  });
});
