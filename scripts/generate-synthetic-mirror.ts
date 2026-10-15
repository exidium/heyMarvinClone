/**
 * Writes a SYNTHETIC research mirror to fixtures/mirror in the same folder and JSON shape as a
 * Dovetail export mirror. All names, companies, quotes and tags are invented (seeded faker), so
 * the fixture can be committed. Run: pnpm mirror:generate
 *
 * Shape:
 *   workspace/all_tags.json, folders.json, all_insights.json
 *   projects/<title>/project.json, files/<title>.md + .json, highlights/highlights.json,
 *   tags_applied.json, participants.json (extension: participant attributes the spec needs)
 */
import { faker } from "@faker-js/faker";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

faker.seed(20261015);
const OUT = process.env.MIRROR_DIR ?? "fixtures/mirror";
const id = () => faker.string.alphanumeric({ length: 22 });
const iso = (d: Date) => d.toISOString().replace("Z", "+00:00");
const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

// ---------- domain vocabulary (invented product names) ----------
const AREAS = [
  { folder: "Power Studio", area: "Power" },
  { folder: "Precision Studio", area: "Precision" },
  { folder: "RF Studio", area: "RF" },
  { folder: "Ecosystem", area: "Ecosystem" },
  { folder: "Block Diagramming", area: "Block Diagramming" },
];
const TOOLS = ["SpiceBench", "PowerPlanner", "SignalForge", "RFCascade", "Datasheet Finder", "Excel", "MATLAB", "Altium", "KiCad", "LTspice-like sim"];
const ROLES = ["Hardware engineer", "RF engineer", "Power engineer", "Systems architect", "FAE", "Design lead", "Student"];
const SEGMENTS = ["Enterprise", "Mid-market", "Startup", "Academic", "Internal"];

const TAG_GROUPS: Record<string, string[]> = {
  "Workflow": ["Workflow described", "Workflow ad hoc", "Multi-tool handoff", "Rework required", "Stage naming mismatch"],
  "Tools": ["Tool positive", "Tool friction", "Excel as primary tool", "External tool preferred", "Simulation gap"],
  "Selection": ["Selection friction", "Cross-vendor comparison", "Internal library first", "Demo board used"],
  "Data sheets": ["Data sheet positive", "Data sheet friction", "Feedback mechanism missing", "Specification depth valued"],
  "Support": ["Support positive", "Support friction", "FAE as differentiator"],
  "Findability": ["Site findability positive", "Site findability friction", "Search gave up"],
  "Sentiment": ["Delight", "Frustration", "Trust", "Skepticism"],
  "AI": ["AI attempted", "AI skepticism", "AI future potential"],
};

const QUOTES = [
  "I usually start from a part I already know and only then look at the catalogue.",
  "The data sheet is great until I need the one parameter that is missing from the table.",
  "We keep a spreadsheet with every component we ever qualified, that is the real library.",
  "Simulation is where it breaks down, I end up hand-transcribing values into my own workbook.",
  "If the FAE answers in a day I stay with the vendor, if it takes a week I move on.",
  "I tried the online search three times and then just opened a distributor site instead.",
  "Selecting the amplifier took two days because I could not compare noise figures across vendors.",
  "The block diagram lives in a slide deck and nobody updates it after the first review.",
  "Honestly I do not trust the AI assistant for numbers, I use it to draft emails.",
  "We redraw the schematic from scratch when the tool chain changes, every single time.",
  "What I want is a reference design that I can actually simulate, not a PDF.",
  "The evaluation board saved us, the simulator did not.",
  "Our stage names do not match what the vendor calls them, so onboarding juniors is painful.",
  "I would pay for a tool that keeps the parameters in sync between selection and layout.",
  "Support was excellent, the engineer joined our call and fixed the footprint on the spot.",
  "The filter wizard is nice but it exports to a format our layout tool cannot read.",
  "Most of my day is finding the right part number, not designing.",
  "The power tree calculator gives me a number but I cannot see the assumptions behind it.",
  "I searched for the thermal derating curve and gave up after ten minutes.",
  "We moved to the competitor because their models were already in our simulator.",
];
const INTERVIEWER_LINES = [
  "Can you walk me through how a typical project starts for you?",
  "What happens after you have the requirements?",
  "Which tools are open on your screen at that point?",
  "Where does it usually go wrong?",
  "How do you compare parts across vendors?",
  "What role does support play in that decision?",
  "Have you tried any AI features in those tools?",
  "If you could change one thing about that step, what would it be?",
  "How do you hand your work over to layout?",
  "Thanks, that is really helpful. Anything else you would add?",
];

// ---------- generate ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "workspace"), { recursive: true });
mkdirSync(join(OUT, "projects"), { recursive: true });

const folders = AREAS.map((a) => ({ id: id(), title: a.folder }));
const groupIds = Object.fromEntries(Object.keys(TAG_GROUPS).map((g) => [g, id()]));
type Tag = { id: string; url: string; title: string; scope: "workspace" | "project"; project_id: string | null; workspace_tag_board: null; group: { id: string; title: string } | null; created_at: string };
const allTags: Tag[] = [];
for (const [group, titles] of Object.entries(TAG_GROUPS)) {
  for (const title of titles) {
    allTags.push({ id: id(), url: `https://example.invalid/tags/${id()}`, title, scope: "workspace", project_id: null, workspace_tag_board: null, group: { id: groupIds[group], title: group }, created_at: iso(faker.date.past({ years: 2 })) });
  }
}

const projectTitles = [
  "2026-02 Discovery - Ecosystem Overview",
  "2026-02 Discovery - Power Engineer Workflows",
  "2026-04 Discovery - Precision Engineer Workflows",
  "2026-07 Discovery - RF Engineer Workflows",
  "2026-10 Discovery - Block Diagramming",
  "2025-11 Usability - Datasheet Finder",
];
const allInsights: unknown[] = [];

projectTitles.forEach((title, pi) => {
  const area = AREAS[pi % AREAS.length];
  const folder = folders[pi % folders.length];
  const pid = id();
  const created = faker.date.between({ from: "2025-10-01", to: "2026-10-01" });
  const pdir = join(OUT, "projects", title);
  mkdirSync(join(pdir, "files"), { recursive: true });
  mkdirSync(join(pdir, "highlights"), { recursive: true });
  mkdirSync(join(pdir, "insights"), { recursive: true });

  // project-scoped tags: a few duplicates of workspace titles plus a couple unique ones
  const projectTags: Tag[] = [];
  for (const t of faker.helpers.arrayElements(allTags, 3)) {
    projectTags.push({ ...t, id: id(), scope: "project", project_id: pid, created_at: iso(created) });
  }
  for (const title of [`${area.area} specific pain`, `${area.area} tool request`]) {
    projectTags.push({ id: id(), url: `https://example.invalid/tags/${id()}`, title, scope: "project", project_id: pid, workspace_tag_board: null, group: faker.datatype.boolean() ? { id: groupIds["Tools"], title: "Tools" } : null, created_at: iso(created) });
  }
  allTags.push(...projectTags);
  const tagPool = [...faker.helpers.arrayElements(allTags.filter((t) => t.scope === "workspace"), 14), ...projectTags];

  // participants
  const nFiles = faker.number.int({ min: 4, max: 6 });
  const participants = Array.from({ length: nFiles }, () => ({
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(ROLES),
    company: faker.company.name(),
    segment: faker.helpers.arrayElement(SEGMENTS),
    tools_used: faker.helpers.arrayElements(TOOLS, { min: 1, max: 4 }),
    notes: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : "",
  }));
  const interviewer = faker.helpers.arrayElement(["Researcher", "Carr, Dana", "Interviewer"]);

  const overview = `# Research Overview: ${title}\n\n## Research Questions\n\n1. ${faker.lorem.sentence()}\n2. ${faker.lorem.sentence()}\n\n## Methodology\n\n* Semi-structured interviews, 60 minutes\n* Participants: ${nFiles}\n`;
  writeFileSync(join(pdir, "project.json"), JSON.stringify({ data: { id: pid, url: `https://example.invalid/projects/${pid}`, author: { id: id(), name: "Example, Researcher" }, title, type: "project", created_at: iso(created), deleted: false, folder: { id: folder.id }, overview } }, null, 2));
  writeFileSync(join(pdir, "participants.json"), JSON.stringify({ project_id: pid, count: participants.length, participants }, null, 2));

  type Seg = { speaker: string; t: number; text: string };
  const files: { id: string; title: string; segs: Seg[]; isNote: boolean; created: Date }[] = [];

  participants.forEach((p, fi) => {
    const fid = id();
    const fdate = faker.date.between({ from: created, to: new Date(created.getTime() + 60 * 86400e3) });
    const isNote = fi === nFiles - 1 && faker.datatype.boolean(0.6);
    const stamp = fdate.toISOString().slice(0, 10).replace(/-/g, "") + "_" + faker.string.numeric(6);
    const ftitle = isNote ? `Session notes - ${p.name}` : `${p.name}-${stamp}-Meeting Recording`;
    let md: string;
    const segs: Seg[] = [];
    if (isNote) {
      md = `## Summary\n\n${faker.lorem.paragraph()}\n\n## Key points\n\n* ${faker.helpers.arrayElement(QUOTES)}\n\n* ${faker.helpers.arrayElement(QUOTES)}\n\n## Follow-ups\n\n${faker.lorem.sentences(2)}\n`;
    } else {
      let t = faker.number.int({ min: 3, max: 40 });
      const turns = faker.number.int({ min: 24, max: 48 });
      const longSession = fi === 0; // first interview runs past one hour to exercise h:mm:ss
      for (let i = 0; i < turns; i++) {
        const isQ = i % 2 === 0;
        const text = isQ
          ? INTERVIEWER_LINES[Math.min(Math.floor(i / 2), INTERVIEWER_LINES.length - 1)]
          : [faker.helpers.arrayElement(QUOTES), faker.datatype.boolean(0.6) ? faker.lorem.sentence() : "", faker.datatype.boolean(0.3) ? faker.helpers.arrayElement(QUOTES) : ""].filter(Boolean).join(" ");
        segs.push({ speaker: isQ ? interviewer : p.name, t, text });
        t += faker.number.int({ min: 6, max: longSession ? 200 : 45 });
      }
      md = `[AudioVideo click to see in Dovetail](https://example.invalid/data/${fid})\n#### Transcript\n` + segs.map((s) => `**${s.speaker} (${clock(s.t)}):** ${s.text} \n`).join("\n");
    }
    writeFileSync(join(pdir, "files", `${ftitle}.md`), md);
    writeFileSync(join(pdir, "files", `${ftitle}.json`), JSON.stringify({ data: { id: fid, url: `https://example.invalid/data/${fid}`, type: "data", title: ftitle, created_at: iso(fdate), deleted: false, content_markdown: md } }, null, 2));
    files.push({ id: fid, title: ftitle, segs, isNote, created: fdate });
  });

  // highlights: mostly verbatim within one turn; some altered, some without times, a few spanning two turns
  const highlights: unknown[] = [];
  const transcriptFiles = files.filter((f) => !f.isNote);
  const nHighlights = faker.number.int({ min: 24, max: 36 });
  for (let i = 0; i < nHighlights; i++) {
    const f = faker.helpers.arrayElement(transcriptFiles);
    const answers = f.segs.map((s, idx) => ({ s, idx })).filter(({ idx }) => idx % 2 === 1);
    const { s, idx } = faker.helpers.arrayElement(answers);
    const next = f.segs[idx + 1];
    const variant = faker.number.int({ min: 0, max: 99 });
    let text: string;
    if (variant < 10 && next) {
      text = `${s.text}\n${next.text}`; // spans two turns
    } else if (variant < 55) {
      text = s.text; // whole turn
    } else {
      const words = s.text.split(" ");
      const a = faker.number.int({ min: 0, max: Math.max(0, words.length - 6) });
      text = words.slice(a, a + faker.number.int({ min: 5, max: 14 })).join(" ");
    }
    if (variant >= 75 && variant < 90) text = text.replace(/ /g, (m, off) => (off % 7 === 0 ? "  " : m)); // whitespace drift
    if (variant >= 90) text = text.replace(/the /, "teh "); // small typo: only time-window can find it
    const hasTime = faker.datatype.boolean(0.75);
    const end = next ? next.t : s.t + 20;
    const tags = faker.datatype.boolean(0.7) ? faker.helpers.arrayElements(tagPool, { min: 1, max: 3 }).map((t) => ({ id: t.id, title: t.title })) : [];
    const hid = id();
    highlights.push({ id: hid, url: `https://example.invalid/data/${f.id}#:v:h=${hid}`, note_id: f.id, tags, text, type: "highlight", start_time: hasTime ? s.t + 0.2 : null, end_time: hasTime ? end - 0.5 : null, created_at: iso(f.created), updated_at: iso(f.created) });
  }
  writeFileSync(join(pdir, "highlights", "highlights.json"), JSON.stringify({ project_id: pid, count: highlights.length, highlights }, null, 2));
  writeFileSync(join(pdir, "tags_applied.json"), JSON.stringify({ project_id: pid, count: tagPool.length, tags: tagPool.map((t) => ({ ...t, project_id: pid })) }, null, 2));

  // one insight doc per project (v2 material)
  const iid = id();
  const ititle = `Insight: ${faker.helpers.arrayElement(["Component selection is the most painful stage", "Spreadsheets compensate for missing simulation", "Support speed decides vendor loyalty", "Search is abandoned for distributor sites"])}`;
  writeFileSync(join(pdir, "insights", `${ititle}.md`), `${faker.lorem.paragraph()}\n\n## What this means\n\n${faker.lorem.paragraph()}\n`);
  writeFileSync(join(pdir, "insights", `${ititle}.json`), JSON.stringify({ data: { id: iid, title: ititle, type: "insight", created_at: iso(created), project_id: pid } }, null, 2));
  allInsights.push({ id: iid, url: `https://example.invalid/docs/${iid}`, title: ititle, type: "insight", created_at: iso(created), folder: null });
});

writeFileSync(join(OUT, "workspace", "all_tags.json"), JSON.stringify({ count: allTags.length, tags: allTags }, null, 2));
writeFileSync(join(OUT, "workspace", "folders.json"), JSON.stringify({ count: folders.length, folders }, null, 2));
writeFileSync(join(OUT, "workspace", "all_insights.json"), JSON.stringify({ count: allInsights.length, insights: allInsights }, null, 2));
writeFileSync(join(OUT, "README.md"), `# Synthetic mirror\n\nGenerated by scripts/generate-synthetic-mirror.ts (seeded). Every name, company, quote and tag is invented. Same folder and JSON shape as a Dovetail export mirror, plus participants.json per project.\n`);
console.log(`wrote ${projectTitles.length} projects, ${allTags.length} tags to ${OUT}`);
