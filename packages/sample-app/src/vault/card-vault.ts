import { pans } from './pan-store.js';

let sequence = 0;

/** Store the card number in the vault and return an opaque token. */
export function tokenize(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 12) throw new Error('Card number is too short');
  sequence += 1;
  const token = `tok_${sequence.toString().padStart(6, '0')}_${digits.slice(-4)}`;
  pans.set(token, digits);
  return token;
}

export function lastFour(token: string): string {
  return token.slice(-4);
}

export function resetVault(): void {
  pans.clear();
  sequence = 0;
}
