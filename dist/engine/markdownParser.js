// marked + highlight.js are vendored locally (esbuild), not CDN-loaded —
// front matter still goes through yamlLite, not marked.

import { parseYAML } from './yamlLite.js';
import { marked } from '../public/js/vendor/marked.esm.js';
import hljs from '../public/js/vendor/highlight.esm.js';

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const html = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const langClass = language ? ` language-${language}` : '';
      return `<pre><code class="hljs${langClass}">${html}</code></pre>\n`;
    },
  },
});

export function splitFrontMatter(raw) {
  const text = String(raw).replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontMatter: {}, body: text };
  const frontMatter = parseYAML(match[1]);
  const body = text.slice(match[0].length);
  return { frontMatter, body };
}

export function renderMarkdown(md) {
  return marked.parse(String(md));
}
