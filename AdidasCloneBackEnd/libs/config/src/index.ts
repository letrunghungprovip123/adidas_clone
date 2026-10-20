/** Configuration helpers; never log secrets. */
export function readPort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function readCorsOrigins(raw: string | undefined, nodeEnv: string | undefined): string[] {
  if (!raw || !raw.trim()) {
    if (nodeEnv === 'production') throw new Error('V2_ALLOWED_ORIGINS is required in production');
    return ['http://localhost:3001', 'http://localhost:3002'];
  }
  const origins = raw.split(',').map(x => x.trim()).filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('V2_ALLOWED_ORIGINS must contain explicit origins, never wildcard');
  }
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('V2_ALLOWED_ORIGINS contains an invalid origin');
    }
  }
  return origins;
}
