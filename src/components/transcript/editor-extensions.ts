import { Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { SegmentNode } from "@/lib/transcript/schema";
import { formatClock } from "@/lib/transcript/time";
import { segmentIdsOf } from "@/lib/transcript/doc";

export type SegmentViewOptions = {
  onSpeakerClick?: (segmentId: string, anchor: HTMLElement, editor: Editor) => void;
  onTimeClick?: (startMs: number) => void;
};

/**
 * Editor-side segment node: plain-DOM node view (a transcript can have thousands of segments),
 * keyboard rules and a transaction filter that together forbid splitting, merging or deleting
 * segments (decision D6). Only the text inside a segment and its attributes can change.
 */
export const SegmentView = SegmentNode.extend<SegmentViewOptions>({
  addOptions() {
    return { onSpeakerClick: undefined, onTimeClick: undefined };
  },

  addNodeView() {
    const opts = this.options;
    const editor = this.editor;
    return ({ node }) => {
      let current: PMNode = node;
      const dom = document.createElement("div");
      dom.className = "segment";
      const gutter = document.createElement("div");
      gutter.className = "segment-gutter";
      gutter.contentEditable = "false";
      const speakerBtn = document.createElement("button");
      speakerBtn.type = "button";
      speakerBtn.className = "segment-speaker";
      const timeBtn = document.createElement("button");
      timeBtn.type = "button";
      timeBtn.className = "segment-time";
      gutter.append(speakerBtn, timeBtn);
      const contentDOM = document.createElement("div");
      contentDOM.className = "segment-text";
      dom.append(gutter, contentDOM);

      const render = (n: PMNode) => {
        dom.dataset.segmentId = n.attrs.segmentId;
        speakerBtn.textContent = n.attrs.speaker ?? "—";
        speakerBtn.title = n.attrs.speaker ? `Speaker: ${n.attrs.speaker}` : "Set speaker";
        timeBtn.textContent = n.attrs.startMs != null ? formatClock(n.attrs.startMs) : "";
        timeBtn.hidden = n.attrs.startMs == null;
      };
      render(node);
      speakerBtn.addEventListener("mousedown", (e) => e.preventDefault());
      speakerBtn.addEventListener("click", (e) => { e.preventDefault(); opts.onSpeakerClick?.(current.attrs.segmentId, speakerBtn, editor); });
      timeBtn.addEventListener("mousedown", (e) => e.preventDefault());
      timeBtn.addEventListener("click", (e) => { e.preventDefault(); if (current.attrs.startMs != null) opts.onTimeClick?.(current.attrs.startMs); });

      return {
        dom,
        contentDOM,
        update(n: PMNode) {
          if (n.type !== node.type) return false;
          current = n;
          render(n);
          return true;
        },
        ignoreMutation(m) {
          if (m.type === "selection") return false;
          return !contentDOM.contains(m.target);
        },
      };
    };
  },

  addKeyboardShortcuts() {
    const atStart = () => { const { empty, $from } = this.editor.state.selection; return empty && $from.parentOffset === 0; };
    const atEnd = () => { const { empty, $from } = this.editor.state.selection; return empty && $from.parentOffset === $from.parent.content.size; };
    return {
      Enter: () => true,
      "Shift-Enter": () => true,
      "Mod-Enter": () => true,
      Backspace: () => atStart(),
      "Mod-Backspace": () => atStart(),
      Delete: () => atEnd(),
      "Mod-Delete": () => atEnd(),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          if (tr.doc.childCount !== state.doc.childCount) return false;
          const before = segmentIdsOf(state.doc);
          const after = segmentIdsOf(tr.doc);
          for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) return false;
          return true;
        },
      }),
    ];
  },
});
