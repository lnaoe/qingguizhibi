const DEFAULT_APP_URL = "http://localhost:3000";
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

export function getAppUrl(
  value = process.env.NEXT_PUBLIC_APP_URL,
): string {
  const rawValue = value?.trim() || DEFAULT_APP_URL;

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL.",
    );
  }

  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL.",
    );
  }

  return url.origin;
}
