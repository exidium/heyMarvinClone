import "server-only";
import { db } from "@/lib/db";
import type { ParsedTranscript } from "@/lib/transcript/types";

/**
 * Replaces a source's segments with a freshly parsed transcript. Callers must have checked that
 * the source has no highlights (decision D20): segments are the anchors highlights point at.
 */
export async function replaceSegments(sourceId: string, parsed: ParsedTranscript) {
  const participants = await db.sourceParticipant.findMany({ where: { sourceId }, select: { participantId: true, speakerLabel: true, participant: { select: { name: true } } } });
  const bySpeaker = new Map<string, string>();
  for (const sp of participants) {
    if (sp.speakerLabel) bySpeaker.set(sp.speakerLabel.toLowerCase(), sp.participantId);
    bySpeaker.set(sp.participant.name.toLowerCase(), sp.participantId);
  }
  await db.$transaction(async (tx) => {
    await tx.highlight.deleteMany({ where: { sourceId } });
    await tx.segment.deleteMany({ where: { sourceId } });
    await tx.segment.createMany({
      data: parsed.segments.map((s, i) => ({
        sourceId, order: i, speaker: s.speaker, startMs: s.startMs, endMs: s.endMs, text: s.text,
        participantId: s.speaker ? bySpeaker.get(s.speaker.toLowerCase()) ?? null : null,
      })),
    });
    await tx.source.update({ where: { id: sourceId }, data: { kind: parsed.kind, status: "READY", errorMessage: null } });
  });
  return parsed.segments.length;
}
