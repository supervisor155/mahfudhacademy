const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

function sanitizeRawUrl(rawUrl) {
  const value = decodeURIComponent(String(rawUrl || '')).trim();

  // Don't touch Supabase URLs - they're already correct
  if (value.includes('supabase.co')) {
    return value;
  }

  // Recover rows saved with placeholder text before the real uploads path.
  const uploadsIndex = value.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return value.slice(uploadsIndex);
  }

  // Repair malformed scheme variants like https:/example.com/file.mp4.
  return value.replace(/^https?:\/(?!\/)/i, (match) => `${match}/`);
}

/**
 * Normalizes media URLs so uploads remain playable across local/prod host changes.
 */
export function resolveMediaUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const apiOrigin = getApiOrigin();
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const currentProtocol = typeof window !== "undefined" ? window.location.protocol : "";
  const sanitized = sanitizeRawUrl(rawUrl);

  // If it's already a Supabase URL, return it as-is (don't modify)
  if (sanitized.includes('supabase.co')) {
    return sanitized;
  }

  // Relative paths (e.g. /uploads/abc.mp4)
  if (sanitized.startsWith("/")) {
    return `${apiOrigin}${sanitized}`;
  }

  try {
    const parsed = new URL(sanitized);

    // Fix rows saved with localhost when running from a different host.
    if (parsed.hostname === "localhost" && currentHost && currentHost !== "localhost") {
      return `${apiOrigin}${parsed.pathname}${parsed.search}`;
    }

    // Avoid mixed-content blocks when app is served on HTTPS.
    if (parsed.protocol === "http:" && currentProtocol === "https:") {
      parsed.protocol = "https:";
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return sanitized;
  }
}
