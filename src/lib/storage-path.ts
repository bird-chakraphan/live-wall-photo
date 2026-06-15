// Extracts the Storage object path from a guest-photos public URL, e.g.
// "https://xyz.supabase.co/storage/v1/object/public/guest-photos/<event>/<file>.jpg"
// -> "<event>/<file>.jpg"
export function storagePathFromUrl(url: string): string | null {
  const marker = "/guest-photos/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}
