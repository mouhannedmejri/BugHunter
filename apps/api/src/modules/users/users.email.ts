/**
 * TODO: enqueue Resend / BullMQ job (see 00_CONTEXT).
 */
export async function notifyUserBanned(email: string, reason: string): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;
  if (process.env['NODE_ENV'] !== 'production') {
    console.info('[notifyUserBanned]', { email, reasonPreview: reason.slice(0, 120) });
  }
}
