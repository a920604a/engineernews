import { glossary } from '../data/glossary';

/**
 * Walks a container's text nodes and wraps the first occurrence of each
 * glossary term in a `<span class="gloss" data-term data-def>`.
 *
 * Terms are English keys; matching is whole-word, case-insensitive. In Chinese
 * prose the CJK↔Latin transition counts as a `\b` boundary, so embedded English
 * jargon (e.g. 「用 latency 衡量」) is matched the same way as in English prose.
 *
 * Skips code / pre / links / headings / already-marked nodes, and marks each
 * term only once per container to avoid visual noise.
 */
export function applyGlossary(container: HTMLElement): void {
  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');
  const markedTerms = new Set<string>();

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('code, pre, a, h1, h2, h3, h4, h5, h6, .gloss')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) nodes.push(node);

  for (const textNode of nodes) {
    const text = textNode.textContent ?? '';
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const term = match[0].toLowerCase();
      const entry = glossary[term];
      if (!entry) continue;

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(term)) {
        markedTerms.add(term);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = entry.zh;
        span.dataset.term = term;
        span.textContent = match[0];
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(match[0]));
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    if (fragment.childNodes.length > 0) {
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
}
