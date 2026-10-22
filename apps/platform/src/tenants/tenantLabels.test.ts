import { describe, expect, it } from 'vitest';
import { label, suggestKey } from './tenantLabels';

describe('tenant labels', () => {
  it('turns enum values into words', () => {
    expect(label('UP_TO_DATE')).toBe('Up to date');
  });

  it('suggests keys the API accepts', () => {
    expect(suggestKey('Acme Corp.')).toBe('acme-corp');
    expect(suggestKey('  Café Ünïcode  ')).toBe('cafe-unicode');
    expect(suggestKey('42 Ventures')).toBe('ventures');
  });
});
