import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveClassState } from "@/lib/api";

type Props = {
  state: LiveClassState;
  startUrl?: string | null;
  joinUrl?: string | null;
  size?: "sm" | "default";
};

export function LiveClassActions({ state, startUrl, joinUrl, size = "sm" }: Props) {
  if (state === "Cancelled" || state === "Ended") return null;

  const hostLink = startUrl?.trim() || null;
  const participantLink = joinUrl?.trim() || null;

  if (!hostLink && !participantLink) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hostLink && (
        <Button size={size} asChild>
          <a href={hostLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Start class
          </a>
        </Button>
      )}
      {participantLink && (
        <Button size={size} variant={hostLink ? "outline" : "default"} asChild>
          <a href={participantLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {hostLink ? "Join link" : "Join class"}
          </a>
        </Button>
      )}
    </div>
  );
}
