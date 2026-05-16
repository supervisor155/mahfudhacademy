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

/**
 * Normalizes media URLs so uploads remain playable across local/prod host changes.
 */
export function resolveMediaUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const apiOrigin = getApiOrigin();
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const currentProtocol = typeof window !== "undefined" ? window.location.protocol : "";

  // Relative paths (e.g. /uploads/abc.mp4)
  if (String(rawUrl).startsWith("/")) {
    return `${apiOrigin}${rawUrl}`;
  }

  try {
    const parsed = new URL(rawUrl);

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
    return rawUrl;
  }
}
