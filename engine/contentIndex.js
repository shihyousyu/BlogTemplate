// Reads manifest.json written by contentScanner.js at build time —
// never scans the filesystem itself.

import { parseYAML } from './yamlLite.js';
import { splitFrontMatter, renderMarkdown } from './markdownParser.js';

const manifestCache = new Map();
const postCache = new Map();
const albumCache = new Map();
const postsIndexPromises = new Map();
const albumsIndexPromises = new Map();

async function loadManifest(basePath) {
    if (manifestCache.has(basePath)) return manifestCache.get(basePath);
    const res = await fetch(`${basePath}/manifest.json`);
    if (!res.ok) throw new Error(`Failed to load manifest: ${basePath}/manifest.json`);
    const json = await res.json();
    manifestCache.set(basePath, json.files || []);
    return json.files || [];
}

// --- Posts (renderer: article) ----------------------------------------

async function loadPost(basePath, file) {
    const slug = file.replace(/\.md$/, '');
    const cacheKey = `${basePath}/${slug}`;
    if (postCache.has(cacheKey)) return postCache.get(cacheKey);
    const res = await fetch(`${basePath}/${file}`);
    const raw = await res.text();
    const { frontMatter, body } = splitFrontMatter(raw);
    const post = {
        slug,
        title: frontMatter.title || slug,
        date: frontMatter.date || '',
        category: frontMatter.category || '',
        tags: frontMatter.tags || [],
        html: renderMarkdown(body),
    };
    postCache.set(cacheKey, post);
    return post;
}

// Metadata only, no HTML render — list views don't need the body.
// Cache key is basePath, not category name, so posts and projects
// don't collide even though both use the article renderer.
export async function listPosts(basePath) {
    if (!postsIndexPromises.has(basePath)) {
        postsIndexPromises.set(basePath, (async () => {
            const files = await loadManifest(basePath);
            const posts = await Promise.all(files.map((f) => loadPost(basePath, f)));
            return posts.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        })());
    }
    return postsIndexPromises.get(basePath);
}

export async function getPost(basePath, slug) {
    const cacheKey = `${basePath}/${slug}`;
    if (postCache.has(cacheKey)) return postCache.get(cacheKey);
    await listPosts(basePath); // populates the cache
    return postCache.get(cacheKey) || null;
}

// --- Photography (renderer: gallery) -----------------------------------

async function loadAlbum(basePath, file) {
    const slug = file.replace(/\/album\.yaml$/, '');
    const cacheKey = `${basePath}/${slug}`;
    if (albumCache.has(cacheKey)) return albumCache.get(cacheKey);
    const res = await fetch(`${basePath}/${file}`);
    const raw = await res.text();
    const meta = parseYAML(raw);
    const folder = `${basePath}/${slug}`;
    const album = {
        slug,
        title: meta.title || slug,
        category: meta.category || '',
        camera: meta.camera || '',
        lens: meta.lens || '',
        film: meta.film || '',
        date: meta.date || '',
        images: (meta.images || []).map((name) => `${folder}/${name}`),
    };
    albumCache.set(cacheKey, album);
    return album;
}

export async function listAlbums(basePath) {
    if (!albumsIndexPromises.has(basePath)) {
        albumsIndexPromises.set(basePath, (async () => {
            const files = await loadManifest(basePath);
            const albums = await Promise.all(files.map((f) => loadAlbum(basePath, f)));
            return albums.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        })());
    }
    return albumsIndexPromises.get(basePath);
}

export async function getAlbum(basePath, slug) {
    const cacheKey = `${basePath}/${slug}`;
    if (albumCache.has(cacheKey)) return albumCache.get(cacheKey);
    await listAlbums(basePath);
    return albumCache.get(cacheKey) || null;
}
