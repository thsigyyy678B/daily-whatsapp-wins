import { useState } from "react";
import { driveId, driveToDirect, driveToPreview } from "@/lib/supabase";

/**
 * Renders a Google Drive link as an image; if the file is actually a video
 * (the image load fails), falls back to Drive's playable inline preview.
 */
export function DriveMedia({ url, className, alt }: { url: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const isDrive = !!driveId(url);

  if (failed && isDrive) {
    return (
      <iframe
        src={driveToPreview(url)}
        title={alt ?? "Google Drive media"}
        className={`${className ?? ""} border-0`}
        allow="autoplay"
      />
    );
  }

  return (
    <img
      src={driveToDirect(url)}
      alt={alt ?? ""}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
