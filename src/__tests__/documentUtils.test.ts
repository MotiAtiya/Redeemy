import { documentNeedsRenewal, getDocumentExpirationDate } from '@/lib/documentUtils';
import type { Document } from '@/types/documentTypes';

function makeDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: 'd1',
    userId: 'u1',
    type: 'license',
    ownerName: 'Alice',
    expirationDate: new Date('2030-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Document;
}

describe('documentNeedsRenewal', () => {
  it('returns true when expirationDate is in the past', () => {
    const doc = makeDoc({
      expirationDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    });
    expect(documentNeedsRenewal(doc)).toBe(true);
  });

  it('returns false when expirationDate is in the future', () => {
    const doc = makeDoc({
      expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
    expect(documentNeedsRenewal(doc)).toBe(false);
  });

  it('accepts ISO string expirationDate (post-rehydration)', () => {
    const doc = makeDoc({
      expirationDate: '2020-01-01' as unknown as Date,
    });
    expect(documentNeedsRenewal(doc)).toBe(true);
  });

  it('accepts Firestore Timestamp-like expirationDate', () => {
    const doc = makeDoc({
      expirationDate: { toDate: () => new Date('2020-01-01') } as unknown as Date,
    });
    expect(documentNeedsRenewal(doc)).toBe(true);
  });
});

describe('getDocumentExpirationDate', () => {
  it('returns a Date for any acceptable input form', () => {
    expect(getDocumentExpirationDate(makeDoc({ expirationDate: new Date('2030-01-01') }))).toBeInstanceOf(Date);
    expect(getDocumentExpirationDate(makeDoc({ expirationDate: '2030-01-01' as unknown as Date }))).toBeInstanceOf(Date);
  });
});
