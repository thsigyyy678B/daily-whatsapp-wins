import { useEffect, useState } from "react";
import { driveCandidates, driveId, driveToPreview } from "@/lib/supabase";

/**
 * Renders a Google Drive link as an image, cycling through Drive's direct-URL
 * formats until one loads. If every format fails (the file is usually a video),
 * falls back to Drive's playable inline preview.
 */
export function DriveMedia({ url, className, alt }: { url: string; className?: string; alt?: string }) {
  const isDrive = !!driveId(url);
  const candidates = driveCandidates(url);
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIdx(0);
    setExhausted(false);
  }, [url]);

  if ((exhausted || idx >= candidates.length) && isDrive) {
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
      src={candidates[Math.min(idx, candidates.length - 1)]}
      alt={alt ?? ""}
      className={className}
      onError={() => (idx + 1 < candidates.length ? setIdx(idx + 1) : setExhausted(true))}
      loading="lazy"
    />
  );
}
