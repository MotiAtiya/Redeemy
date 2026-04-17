import { CreditSchema, UserSchema } from '@/lib/validation';
import { CreditStatus } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// CreditSchema
// ---------------------------------------------------------------------------

describe('CreditSchema', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const validInput = {
    storeName: 'Zara',
    amountInput: '50.00',
    category: 'Clothing',
    expirationDate: futureDate,
    reminderDays: 7,
    notes: 'Summer sale credit',
    imageUri: undefined,
  };

  it('accepts valid input and converts amountInput to agot integer', () => {
    const result = CreditSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountInput).toBe(5000); // 50.00 → 5000 agot
    }
  });

  it('converts decimal amounts correctly', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: '9.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountInput).toBe(999);
    }
  });

  it('rejects empty store name', () => {
    const result = CreditSchema.safeParse({ ...validInput, storeName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty amountInput', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: '' });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: '-10' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric amount', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects expiration date in the past', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = CreditSchema.safeParse({ ...validInput, expirationDate: pastDate });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = CreditSchema.safeParse({ ...validInput, category: '' });
    expect(result.success).toBe(false);
  });

  it('defaults notes to empty string when omitted', () => {
    const { notes: _notes, ...withoutNotes } = validInput;
    const result = CreditSchema.safeParse(withoutNotes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('');
    }
  });

  it('accepts whole number amounts', () => {
    const result = CreditSchema.safeParse({ ...validInput, amountInput: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountInput).toBe(10000);
    }
  });
});

// ---------------------------------------------------------------------------
// UserSchema
// ---------------------------------------------------------------------------

describe('UserSchema', () => {
  it('accepts valid user with all fields', () => {
    const result = UserSchema.safeParse({
      uid: 'user123',
      email: 'user@example.com',
      displayName: 'John Doe',
      photoURL: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts user with only uid', () => {
    const result = UserSchema.safeParse({ uid: 'user123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty uid', () => {
    const result = UserSchema.safeParse({ uid: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({ uid: 'user123', email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid photoURL', () => {
    const result = UserSchema.safeParse({ uid: 'user123', photoURL: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});
