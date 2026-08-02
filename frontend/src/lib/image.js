const DRIVE_ID_RE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/;

// Converts a Google Drive share link to a direct-viewable image URL.
// Requires the file to be shared "Anyone with the link".
export function normalizeImageUrl(value) {
  const url = (value || "").trim();
  const match = url.match(DRIVE_ID_RE);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

export function resolveImageSrc(value) {
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("http")) return value;
  return `data:image/jpeg;base64,${value}`;
}
