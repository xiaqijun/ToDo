import crypto from 'crypto';

export function generateKey(): string {
  return 'td_' + crypto.randomBytes(24).toString('hex');
}
