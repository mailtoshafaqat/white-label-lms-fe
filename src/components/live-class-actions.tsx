import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveClassState } from "@/lib/api";
import {
  canHostStartLiveClass,
  canStudentJoinLiveClass,
  liveClassHostStartHint,
  liveClassJoinHint,
} from "@/lib/live-class-utils";

type Props = {
  state: LiveClassState;
  scheduledStartUtc: string;
  startUrl?: string | null;
  joinUrl?: string | null;
  size?: "sm" | "default";
};

export function LiveClassActions({
  state,
  scheduledStartUtc,
  startUrl,
  joinUrl,
  size = "sm",
}: Props) {
  if (state === "Cancelled" || state === "Ended") return null;

  const hostLink = startUrl?.trim() || null;
  const participantLink = joinUrl?.trim() || null;
  const hostCanStart = hostLink ? canHostStartLiveClass(state, scheduledStartUtc) : false;
  const studentCanJoin = participantLink ? canStudentJoinLiveClass(state) : false;

  if (!hostLink && !participantLink) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hostLink &&
        (hostCanStart ? (
          <Button size={size} asChild>
            <a
              href={hostLink}
              target="_blank"
              rel="noopener noreferrer"
              title={liveClassHostStartHint(state, scheduledStartUtc)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Start class
            </a>
          </Button>
        ) : (
          <Button
            size={size}
            type="button"
            disabled
            title={liveClassHostStartHint(state, scheduledStartUtc)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Start class
          </Button>
        ))}
      {participantLink &&
        (studentCanJoin ? (
          <Button size={size} variant={hostLink ? "outline" : "default"} asChild>
            <a
              href={participantLink}
              target="_blank"
              rel="noopener noreferrer"
              title={liveClassJoinHint(state, scheduledStartUtc)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {hostLink ? "Join link" : "Join class"}
            </a>
          </Button>
        ) : (
          <Button
            size={size}
            type="button"
            variant={hostLink ? "outline" : "default"}
            disabled
            title={liveClassJoinHint(state, scheduledStartUtc)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {hostLink ? "Join link" : "Join class"}
          </Button>
        ))}
    </div>
  );
}
