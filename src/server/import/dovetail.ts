/**
 * Imports a research mirror in the Dovetail-export folder shape into the database.
 * Runs from the seed (tsx) and later from an admin command, so it takes a Prisma client and
 * must not import server-only modules. Idempotent: everything is upserted by externalId.
 *
 *   workspace/all_tags.json            → TagGroup, Tag (deduped case-insensitively)
 *   workspace/folders.json             → folder title becomes the project's product area
 *   projects/<title>/project.json      → Project
 *   projects/<title>/participants.json → Participant (optional extension file)
 *   projects/<title>/files/*.json      → Source + Segment (content_markdown parsed)
 *   projects/<title>/highlights/*.json → Highlight (text located inside segments) + HighlightTag
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { parseDovetailMarkdown } from "@/lib/transcript/parse-dovetail-md";
import { buildLocateIndex, locateText, sliceAnchors } from "@/lib/transcript/locate";

type MirrorTag = { id: string; title: string; scope: string; project_id: string | null; group: { id: string; title: string } | null };
type MirrorProject = { data: { id: string; title: string; created_at: string; folder?: { id: string } | null; overview?: string } };
type MirrorFile = { data: { id: string; title: string; created_at: string; content_markdown: string } };
type MirrorHighlight = { id: string; note_id: string; tags: { id: string; title: string }[]; text: string; start_time: number | null; end_time: number | null; created_at: string };
type MirrorParticipant = { name: string; role?: string; company?: string; segment?: string; tools_used?: string[]; notes?: string };

export type ImportStats = {
  projects: number; sources: number; segments: number; participants: number;
  tags: number; tagGroups: number; highlights: number; orphaned: number;
  located: Record<string, number>;
};

const readJson = <T,>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

export async function importMirror(db: PrismaClient, mirrorDir: string, opts: { ownerId: string; log?: (s: string) => void }): Promise<ImportStats> {
  const log = opts.log ?? (() => {});
  const stats: ImportStats = { projects: 0, sources: 0, segments: 0, participants: 0, tags: 0, tagGroups: 0, highlights: 0, orphaned: 0, located: {} };

  // ---- folders → product area ----
  const folderArea = new Map<string, string>();
  const foldersPath = join(mirrorDir, "workspace", "folders.json");
  if (existsSync(foldersPath)) {
    for (const f of readJson<{ folders: { id: string; title: string }[] }>(foldersPath).folders ?? []) folderArea.set(f.id, f.title);
  }

  // ---- tags ----
  const tagIdMap = new Map<string, string>(); // mirror tag id → db tag id
  const tagsPath = join(mirrorDir, "workspace", "all_tags.json");
  if (existsSync(tagsPath)) {
    const tags = readJson<{ tags: MirrorTag[] }>(tagsPath).tags ?? [];
    const groupIds = new Map<string, string>();
    let pos = 0;
    for (const t of tags) {
      const gTitle = t.group?.title?.trim();
      if (gTitle && !groupIds.has(gTitle.toLowerCase())) {
        const g = await db.tagGroup.upsert({ where: { name: gTitle }, update: {}, create: { name: gTitle, position: pos++ } });
        groupIds.set(gTitle.toLowerCase(), g.id);
        stats.tagGroups++;
      }
    }
    const byName = new Map<string, string>(); // lower(title) → db tag id
    for (const t of tags) {
      const title = t.title.trim();
      if (!title) continue;
      const key = title.toLowerCase();
      let dbId = byName.get(key);
      if (!dbId) {
        const existing = await db.tag.findFirst({ where: { name: { equals: title, mode: "insensitive" } } });
        const groupId = t.group?.title ? groupIds.get(t.group.title.trim().toLowerCase()) ?? null : null;
        const tag = existing
          ? await db.tag.update({ where: { id: existing.id }, data: { externalIds: { push: t.id }, groupId: existing.groupId ?? groupId } })
          : await db.tag.create({ data: { name: title, groupId, externalIds: [t.id] } });
        dbId = tag.id;
        byName.set(key, dbId);
        stats.tags++;
      } else {
        await db.tag.update({ where: { id: dbId }, data: { externalIds: { push: t.id } } });
      }
      tagIdMap.set(t.id, dbId);
    }
  }

  // ---- projects ----
  const projectsDir = join(mirrorDir, "projects");
  const projectDirs = existsSync(projectsDir) ? readdirSync(projectsDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
  for (const dirent of projectDirs) {
    const pdir = join(projectsDir, dirent.name);
    const pjPath = join(pdir, "project.json");
    if (!existsSync(pjPath)) continue;
    const pj = readJson<MirrorProject>(pjPath).data;
    const project = await db.project.upsert({
      where: { externalId: pj.id },
      update: { name: pj.title, goal: pj.overview?.slice(0, 2000) ?? null, productArea: pj.folder ? folderArea.get(pj.folder.id) ?? null : null },
      create: { externalId: pj.id, name: pj.title, goal: pj.overview?.slice(0, 2000) ?? null, productArea: pj.folder ? folderArea.get(pj.folder.id) ?? null : null, startDate: new Date(pj.created_at), ownerId: opts.ownerId },
    });
    stats.projects++;
    log(`project ${pj.title}`);

    // participants (optional extension file)
    const speakerToParticipant = new Map<string, string>();
    const partPath = join(pdir, "participants.json");
    if (existsSync(partPath)) {
      for (const p of readJson<{ participants: MirrorParticipant[] }>(partPath).participants ?? []) {
        const existing = await db.participant.findFirst({ where: { name: p.name } });
        const data = { name: p.name, role: p.role ?? null, company: p.company ?? null, segment: p.segment ?? null, toolsUsed: p.tools_used ?? [], notes: p.notes || null };
        const row = existing ? await db.participant.update({ where: { id: existing.id }, data }) : await db.participant.create({ data });
        if (!existing) stats.participants++;
        speakerToParticipant.set(p.name, row.id);
      }
    }

    // sources + segments
    const filesDir = join(pdir, "files");
    const segmentIndexBySource = new Map<string, ReturnType<typeof buildLocateIndex>>();
    const sourceIdByExternal = new Map<string, string>();
    if (existsSync(filesDir)) {
      for (const f of readdirSync(filesDir).filter((n) => n.endsWith(".json"))) {
        const file = readJson<MirrorFile>(join(filesDir, f)).data;
        const parsed = parseDovetailMarkdown(file.content_markdown ?? "");
        const source = await db.source.upsert({
          where: { externalId: file.id },
          update: { title: file.title, kind: parsed.kind, status: "READY", date: new Date(file.created_at) },
          create: { externalId: file.id, projectId: project.id, title: file.title, kind: parsed.kind, status: "READY", date: new Date(file.created_at) },
        });
        // Re-import replaces segments (and therefore highlights) of this source.
        await db.highlight.deleteMany({ where: { sourceId: source.id } });
        await db.segment.deleteMany({ where: { sourceId: source.id } });
        await db.segment.createMany({
          data: parsed.segments.map((s, i) => ({
            sourceId: source.id, order: i, speaker: s.speaker, startMs: s.startMs, endMs: s.endMs, text: s.text,
            participantId: s.speaker ? speakerToParticipant.get(s.speaker) ?? null : null,
          })),
        });
        const segments = await db.segment.findMany({ where: { sourceId: source.id }, orderBy: { order: "asc" }, select: { id: true, order: true, text: true, startMs: true, endMs: true } });
        segmentIndexBySource.set(source.id, buildLocateIndex(segments));
        sourceIdByExternal.set(file.id, source.id);
        stats.sources++;
        stats.segments += segments.length;

        // link participants who speak in this source
        const speakers = new Set(parsed.segments.map((s) => s.speaker).filter((s): s is string => !!s));
        for (const sp of speakers) {
          const pid = speakerToParticipant.get(sp);
          if (!pid) continue;
          await db.sourceParticipant.upsert({ where: { sourceId_participantId: { sourceId: source.id, participantId: pid } }, update: { speakerLabel: sp }, create: { sourceId: source.id, participantId: pid, speakerLabel: sp } });
        }
      }
    }

    // highlights
    const hlPath = join(pdir, "highlights", "highlights.json");
    if (existsSync(hlPath)) {
      for (const h of readJson<{ highlights: MirrorHighlight[] }>(hlPath).highlights ?? []) {
        const sourceId = sourceIdByExternal.get(h.note_id);
        const index = sourceId ? segmentIndexBySource.get(sourceId) : undefined;
        if (!sourceId || !index || index.segments.length === 0) continue;
        const times = { startMs: h.start_time == null ? null : Math.round(h.start_time * 1000), endMs: h.end_time == null ? null : Math.round(h.end_time * 1000) };
        const found = locateText(index, h.text, times);
        const method = found?.method ?? "none";
        stats.located[method] = (stats.located[method] ?? 0) + 1;
        const first = index.segments[0];
        const anchors = found?.anchors ?? { startSegmentId: first.id, startOffset: 0, endSegmentId: first.id, endOffset: 0 };
        const status = found ? "ACTIVE" : "ORPHANED";
        if (!found) stats.orphaned++;
        // Canonical text is the transcript slice the anchors cover; orphans keep the quoted text.
        const text = found ? sliceAnchors(index.segments, anchors) : h.text.trim();
        const highlight = await db.highlight.upsert({
          where: { externalId: h.id },
          update: { ...anchors, status, text, sourceId },
          create: { externalId: h.id, sourceId, ...anchors, status, text, createdById: opts.ownerId, createdAt: new Date(h.created_at) },
        });
        const tagIds = [...new Set(h.tags.map((t) => tagIdMap.get(t.id)).filter((x): x is string => !!x))];
        if (tagIds.length) {
          await db.highlightTag.createMany({ data: tagIds.map((tagId) => ({ highlightId: highlight.id, tagId })), skipDuplicates: true });
        }
        stats.highlights++;
      }
    }
  }
  return stats;
}
