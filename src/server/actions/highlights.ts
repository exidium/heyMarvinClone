"use server";

import { db } from "@/lib/db";
import { AuthzError, projectIdOfHighlight, projectIdOfSegment, projectIdOfSource } from "@/lib/authz";
import { projectAction } from "@/server/action";
import { sliceAnchors, type Anchors } from "@/lib/transcript/locate";
import {
  CreateHighlightSchema, DeleteHighlightSchema, RenameSpeakerSchema, SaveSegmentSchema, SetHighlightNoteSchema, SetHighlightTagsSchema,
} from "@/lib/validation/highlight";
import { highlightSelect } from "@/server/queries/highlights";


type SegRow = { id: string; order: number; text: string };

async function segmentsOfSource(sourceId: string): Promise<SegRow[]> {
  return db.segment.findMany({ where: { sourceId }, orderBy: { order: "asc" }, select: { id: true, order: true, text: true } });
}

function validateAnchors(segments: SegRow[], a: Anchors) {
  const s = segments.find((x) => x.id === a.startSegmentId);
  const e = segments.find((x) => x.id === a.endSegmentId);
  if (!s || !e) throw new AuthzError("Segment not found in this source");
  if (s.order > e.order) throw new AuthzError("Highlight ends before it starts");
  if (a.startOffset > s.text.length || a.endOffset > e.text.length) throw new AuthzError("Offset outside segment text");
  if (s.id === e.id && a.endOffset <= a.startOffset) throw new AuthzError("Empty highlight");
}

export const createHighlight = projectAction(CreateHighlightSchema, "EDITOR", (i) => projectIdOfSource(i.sourceId), async ({ sourceId, tagIds, ...anchors }, { user }) => {
  const segments = await segmentsOfSource(sourceId);
  validateAnchors(segments, anchors);
  const text = sliceAnchors(segments, anchors);
  if (!text.trim()) throw new AuthzError("Empty highlight");
  return db.highlight.create({
    data: { sourceId, ...anchors, text, createdById: user.id, tags: { create: tagIds.map((tagId) => ({ tagId })) } },
    select: highlightSelect,
  });
});

export const setHighlightTags = projectAction(SetHighlightTagsSchema, "EDITOR", (i) => projectIdOfHighlight(i.highlightId), async ({ highlightId, tagIds }) => {
  await db.$transaction([
    db.highlightTag.deleteMany({ where: { highlightId, tagId: { notIn: tagIds } } }),
    db.highlightTag.createMany({ data: tagIds.map((tagId) => ({ highlightId, tagId })), skipDuplicates: true }),
  ]);
  return db.highlight.findUniqueOrThrow({ where: { id: highlightId }, select: highlightSelect });
});

export const setHighlightNote = projectAction(SetHighlightNoteSchema, "EDITOR", (i) => projectIdOfHighlight(i.highlightId), async ({ highlightId, note }) => {
  return db.highlight.update({ where: { id: highlightId }, data: { note }, select: highlightSelect });
});

export const deleteHighlight = projectAction(DeleteHighlightSchema, "EDITOR", (i) => projectIdOfHighlight(i.highlightId), async ({ highlightId }) => {
  await db.highlight.delete({ where: { id: highlightId } });
  return { id: highlightId };
});

/**
 * Saves one segment's text after an edit and re-anchors the highlights that start or end in it,
 * from the mark ranges the editor still shows. Highlights whose marks vanished become ORPHANED
 * (single-segment) or shrink to the neighbouring segment boundary (multi-segment). See D5/D19.
 */
export const saveSegment = projectAction(SaveSegmentSchema, "EDITOR", (i) => projectIdOfSegment(i.segmentId), async ({ segmentId, version, text, marks }) => {
  return db.$transaction(async (tx) => {
    const seg = await tx.segment.findUniqueOrThrow({ where: { id: segmentId }, select: { id: true, sourceId: true, order: true, version: true } });
    if (seg.version !== version) throw new AuthzError("This line changed elsewhere; reload to continue editing.");
    const updated = await tx.segment.update({ where: { id: segmentId }, data: { text, version: { increment: 1 } }, select: { version: true } });

    const segments: SegRow[] = await tx.segment.findMany({ where: { sourceId: seg.sourceId }, orderBy: { order: "asc" }, select: { id: true, order: true, text: true } });
    const idx = segments.findIndex((s) => s.id === segmentId);
    const prev = segments[idx - 1];
    const next = segments[idx + 1];
    const byMark = new Map<string, { from: number; to: number }>();
    for (const m of marks) {
      const cur = byMark.get(m.highlightId);
      if (!cur) byMark.set(m.highlightId, { from: m.from, to: m.to });
      else { cur.from = Math.min(cur.from, m.from); cur.to = Math.max(cur.to, m.to); }
    }

    const touched = await tx.highlight.findMany({
      where: { sourceId: seg.sourceId, OR: [{ startSegmentId: segmentId }, { endSegmentId: segmentId }, { id: { in: [...byMark.keys()] } }] },
      select: { id: true, startSegmentId: true, startOffset: true, endSegmentId: true, endOffset: true, status: true },
    });

    const results = [];
    for (const h of touched) {
      const range = byMark.get(h.id);
      let a: Anchors = { startSegmentId: h.startSegmentId, startOffset: h.startOffset, endSegmentId: h.endSegmentId, endOffset: h.endOffset };
      let status: "ACTIVE" | "ORPHANED" = "ACTIVE";
      const startsHere = h.startSegmentId === segmentId;
      const endsHere = h.endSegmentId === segmentId;
      if (range) {
        if (startsHere) a = { ...a, startOffset: range.from };
        if (endsHere) a = { ...a, endOffset: range.to };
        if (!startsHere && !endsHere) continue; // a middle segment: anchors unaffected
      } else if (startsHere && endsHere) {
        status = "ORPHANED";
        a = { ...a, startOffset: Math.min(a.startOffset, text.length), endOffset: Math.min(a.endOffset, text.length) };
      } else if (startsHere) {
        if (!next) status = "ORPHANED"; else a = { ...a, startSegmentId: next.id, startOffset: 0 };
      } else if (endsHere) {
        if (!prev) status = "ORPHANED"; else a = { ...a, endSegmentId: prev.id, endOffset: prev.text.length };
      } else continue;

      // Guard against an inverted or empty range after shifting.
      const so = segments.find((s) => s.id === a.startSegmentId)!.order;
      const eo = segments.find((s) => s.id === a.endSegmentId)!.order;
      if (status === "ACTIVE" && (so > eo || (so === eo && a.endOffset <= a.startOffset))) status = "ORPHANED";
      const newText = status === "ACTIVE" ? sliceAnchors(segments, a) : undefined;
      const row = await tx.highlight.update({ where: { id: h.id }, data: { ...a, status, ...(newText !== undefined ? { text: newText } : {}) }, select: highlightSelect });
      results.push(row);
    }
    return { version: updated.version, highlights: results };
  });
});

export const renameSpeaker = projectAction(RenameSpeakerSchema, "EDITOR", (i) => projectIdOfSource(i.sourceId), async ({ sourceId, segmentId, scope, speaker, participantId }) => {
  const seg = await db.segment.findUniqueOrThrow({ where: { id: segmentId }, select: { speaker: true, sourceId: true } });
  if (seg.sourceId !== sourceId) throw new AuthzError("Segment not in source");
  const where = scope === "all" ? { sourceId, speaker: seg.speaker } : { id: segmentId };
  const data = { speaker, ...(participantId !== undefined ? { participantId } : {}) };
  const ids = await db.segment.findMany({ where, select: { id: true } });
  await db.segment.updateMany({ where, data });
  if (participantId) {
    await db.sourceParticipant.upsert({
      where: { sourceId_participantId: { sourceId, participantId } },
      update: { speakerLabel: speaker },
      create: { sourceId, participantId, speakerLabel: speaker },
    });
  }
  return { segmentIds: ids.map((s) => s.id), speaker };
});
