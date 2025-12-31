// URL utilities for backend-hosted assets.
const BACKEND_BASE_URL = 'http://localhost:3000';

/**
 * Gera uma URL absoluta para recursos vindos do backend.
 */
export const resolveBackendUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${BACKEND_BASE_URL}${path}`;
};
