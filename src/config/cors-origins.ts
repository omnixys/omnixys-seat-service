const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://studio.apollographql.com',
];

/** A deployment supplies one exact browser origin, never a wildcard or URL path. */
export function parseCheckpointOrigin(value: string): string {
  if (value === '') {
    return '';
  }
  try {
    const origin = new URL(value);
    if (
      !/^https?:\/\/[^/?#]+\/?$/i.test(value) ||
      /[\s,*\\]/.test(value) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      !origin.hostname ||
      /[*,]/.test(origin.hostname) ||
      !['http:', 'https:'].includes(origin.protocol)
    ) {
      throw new Error('Invalid origin');
    }
    return origin.origin;
  } catch {
    // Do not echo configuration values: a mistaken URL may contain credentials.
    throw new Error(
      '[ENV] CHECKPOINT_ORIGIN must be a single HTTP(S) origin without credentials, path, query, fragment or wildcard.',
    );
  }
}

export function corsOriginAllowlist(checkpointOrigin: string): string[] {
  const configured = parseCheckpointOrigin(checkpointOrigin);
  return [
    ...new Set([...DEFAULT_ORIGINS, ...(configured ? [configured] : [])]),
  ];
}
