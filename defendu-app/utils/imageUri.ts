/**
 * URIs suitable for <Image source={{ uri }}> on web and native.
 * Rejects ephemeral blob: URLs (e.g. from web file picks) that break after reload.
 */
export function isStableRemoteImageUri(uri: string | undefined | null): boolean {
  const u = String(uri ?? '').trim();
  if (!u) return false;
  const lower = u.toLowerCase();
  if (lower.startsWith('blob:')) return false;
  return lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('data:');
}
