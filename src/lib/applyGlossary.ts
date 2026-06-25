import { getGlossaryLookup, type GlossaryEntry } from './glossary/terms';

/**
 * Walks a container's text nodes and wraps the first occurrence of each
 * glossary term (or alias) in a `<span class="gloss" data-term data-def>`.
 *
 * Matching is whole-word, case-insensitive. In Chinese prose the CJK↔Latin
 * transition counts as a `\b` boundary, so embedded English jargon
 * (e.g. 「用 latency 衡量」) is matched the same way as in English prose.
 *
 * `data-term` holds the canonical term so the click-card / explain API can
 * look the entry up; `data-def` holds the short translation for the hover hint.
 *
 * Pass `extraEntries` (a post's frontmatter `glossary`) to add article-specific
 * terms on top of the site-wide defaults.
 */
export function applyGlossary(container: HTMLElement, extraEntries: GlossaryEntry[] = []): void {
  // Build the match map: site-wide defaults + this article's frontmatter terms.
  const lookup = new Map(getGlossaryLookup());
  for (const entry of extraEntries) {
    lookup.set(entry.term.toLowerCase(), entry);
    for (const alias of entry.aliases ?? []) lookup.set(alias.toLowerCase(), entry);
  }

  const keys = Array.from(lookup.keys()).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return;
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
      const entry = lookup.get(match[0].toLowerCase());
      if (!entry) continue;
      const canonical = entry.term;

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(canonical)) {
        markedTerms.add(canonical);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = entry.zh ?? entry.definition ?? canonical;
        span.dataset.term = canonical;
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
