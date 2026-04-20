import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import type { VFile } from 'vfile';

const WPM = 200;

export function remarkReadingTime() {
  return function (tree: Root, file: VFile) {
    const text = toString(tree);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / WPM));

    // inject into Astro frontmatter data
    const data = file.data as { astro?: { frontmatter?: Record<string, unknown> } };
    if (!data.astro) data.astro = {};
    if (!data.astro.frontmatter) data.astro.frontmatter = {};
    data.astro.frontmatter.readingTime = minutes;
  };
}
