export function getSupabasePublicUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "/placeholder-image.png";
  
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    try {
      const url = new URL(pathOrUrl);
      if (url.hostname === "sibfrwzhsvkhtshakoaf.supabase.co") {
        return url.toString();
      }
      return "/placeholder-image.png";
    } catch {
      return "/placeholder-image.png";
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "/placeholder-image.png";
  
  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl.slice(1) : pathOrUrl;
  return `${baseUrl}/storage/v1/object/public/photos/${cleanPath}`;
}
