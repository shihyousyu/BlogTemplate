// Cached per path so route changes don't re-fetch/re-parse config.

import { parseYAML } from './yamlLite.js';

const cache = new Map();

export async function loadConfig(path) {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load config: ${path} (${res.status})`);
    const text = await res.text();
    const parsed = parseYAML(text);
    cache.set(path, parsed);
    return parsed;
}

export async function loadAllConfig() {
    const [site, profile, navbar, theme, layout, content] = await Promise.all([
        loadConfig('config/site.yaml'),
        loadConfig('config/profile.yaml'),
        loadConfig('config/navbar.yaml'),
        loadConfig('config/theme.yaml'),
        loadConfig('config/layout.yaml'),
        loadConfig('config/content.yaml'),
    ]);
    return { site, profile, navbar, theme, layout, content };
}
