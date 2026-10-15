/**
 * TipTap schema for the transcript editor. Pure (no DOM, no React) so it can be used by the
 * server-side doc builder and unit tests as well as the editor. Node views live in the editor.
 *
 *   doc > segment+ ; segment > text* with the "highlight" mark only.
 */
import { Mark, Node, mergeAttributes } from "@tiptap/core";
import { Text } from "@tiptap/extension-text";

export const TranscriptDoc = Node.create({ name: "doc", topNode: true, content: "segment+" });

export const SegmentNode = Node.create({
  name: "segment",
  content: "text*",
  marks: "highlight",
  isolating: true,
  defining: true,
  addAttributes() {
    return {
      segmentId: { default: null },
      order: { default: 0 },
      speaker: { default: null },
      startMs: { default: null },
      endMs: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-segment-id]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-segment-id": node.attrs.segmentId, class: "segment" }), 0];
  },
});

export const HighlightMark = Mark.create({
  name: "highlight",
  inclusive: false, // typing at the edge of a highlight does not extend it
  excludes: "", // highlights may overlap
  spanning: true,
  addAttributes() {
    return {
      highlightId: { default: null },
      color: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "mark[data-highlight-id]" }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const style = mark.attrs.color ? `--hl:${mark.attrs.color}` : undefined;
    return ["mark", mergeAttributes(HTMLAttributes, { "data-highlight-id": mark.attrs.highlightId, class: "hl", style }), 0];
  },
});

export const transcriptExtensions = [TranscriptDoc, SegmentNode, Text, HighlightMark];
