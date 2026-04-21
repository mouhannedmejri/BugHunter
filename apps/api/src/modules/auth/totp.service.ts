import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { prisma } from '@bughuntr/db';
import { BadRequestError } from '@bughuntr/shared';
import { encrypt, decrypt } from '../../lib/crypto.js';

const APP_NAME = 'BugHuntr';

/**
 * Generate a new TOTP secret for a user and return the secret + QR code.
 */
export async function setupTotp(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.totpEnabled) {
    throw new BadRequestError('TOTP is already enabled');
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, APP_NAME, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  // Encrypt and temporarily store — not enabled until verified
  const encryptedSecret = encrypt(secret);
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: encryptedSecret },
  });

  return {
    secret,
    qrCodeDataUrl,
    otpauth,
  };
}

/**
 * Verify a TOTP code against the user's (pending) secret and enable TOTP.
 */
export async function verifyAndEnableTotp(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.totpEnabled) {
    throw new BadRequestError('TOTP is already enabled');
  }

  if (!user.totpSecret) {
    throw new BadRequestError('No TOTP setup in progress. Call /auth/totp/setup first');
  }

  const secret = decrypt(user.totpSecret);
  const isValid = authenticator.verify({ token: code, secret });

  if (!isValid) {
    throw new BadRequestError('Invalid TOTP code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });

  return { message: 'TOTP enabled successfully' };
}

/**
 * Disable TOTP after verifying a valid code.
 */
export async function disableTotp(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.totpEnabled || !user.totpSecret) {
    throw new BadRequestError('TOTP is not enabled');
  }

  const secret = decrypt(user.totpSecret);
  const isValid = authenticator.verify({ token: code, secret });

  if (!isValid) {
    throw new BadRequestError('Invalid TOTP code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null },
  });

  return { message: 'TOTP disabled successfully' };
}

/**
 * Verify a TOTP code for login (user already has TOTP enabled).
 */
export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = decrypt(encryptedSecret);
  return authenticator.verify({ token: code, secret });
}
