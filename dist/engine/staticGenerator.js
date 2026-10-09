// Native static-site generator. It deliberately shares yamlLite and the
// Markdown renderer with the browser application so build-time and client-side
// output stay consistent without a hydration framework.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYAML } from './yamlLite.js';
import { renderMarkdown, splitFrontMatter } from './markdownParser.js';
import { scanContent } from './contentScanner.js';
import { escapeHtml } from '../components/util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function readYaml(relativePath) {
    return parseYAML(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readManifest(categoryPath) {
    const file = path.join(ROOT, 'content', categoryPath, 'manifest.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).files || [] : [];
}

function cleanSiteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('config/site.yaml requires site.url for canonical URLs and sitemap generation.');
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:') throw new Error('config/site.yaml site.url must use HTTPS.');
    return url.href.replace(/\/$/, '');
}

function routePath(route) {
    return route === '/' ? '/' : `/${route.replace(/^\/+|\/+$/g, '')}/`;
}

function outputFile(route) {
    return route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.replace(/^\//, ''), 'index.html');
}

function stripDuplicateTitle(html, title) {
    const escaped = escapeHtml(title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(new RegExp(`^\\s*<h1[^>]*>\\s*${escaped}\\s*<\\/h1>\\s*`, 'i'), '');
}

function summaryFromHtml(html) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

function metaTags({ title, description, canonical, image }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description || '');
    const safeUrl = escapeHtml(canonical);
    const safeImage = image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '';
    return `<title>${safeTitle}</title>\n    <meta name="description" content="${safeDescription}" />\n    <link rel="canonical" href="${safeUrl}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:title" content="${safeTitle}" />\n    <meta property="og:description" content="${safeDescription}" />\n    <meta property="og:url" content="${safeUrl}" />${safeImage ? `\n    ${safeImage}` : ''}`;
}

function navHtml(config, currentRoute) {
    const nav = config.navbar?.navbar;
    if (!nav || nav.enabled === false) return '';
    const isActive = (url) => url === '/' ? currentRoute === '/' : currentRoute === url || currentRoute.startsWith(`${url}/`);
    return `<div class="navbar-list">${(nav.items || []).map((item) => {
        const active = isActive(item.url) || item.children?.some((child) => isActive(child.url));
        const children = (item.children || []).map((child) => `<a class="navbar-dropdown-link${isActive(child.url) ? ' is-active' : ''}" href="${escapeHtml(routePath(child.url))}">${escapeHtml(child.name)}</a>`).join('');
        return `<div class="navbar-item${item.children?.length ? ' has-children' : ''}"><a class="navbar-link${active ? ' is-active' : ''}" href="${escapeHtml(routePath(item.url))}">${escapeHtml(item.name)}</a>${children ? `<span class="ssg-subnav">${children}</span>` : ''}</div>`;
    }).join('')}</div>`;
}

function profileHtml(config) {
    const profile = config.profile?.profile;
    if (!profile) return '';
    const links = (profile.links || []).map((link) => `<a class="profile-link-btn" href="${escapeHtml(link.url || '#')}" aria-label="${escapeHtml(link.name || '')}"${/^https?:\/\//.test(link.url || '') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(link.name || 'Link')}</a>`).join('');
    return `<div class="profile-avatar-frame"><img class="profile-avatar" src="${escapeHtml(profile.avatar?.image || '')}" alt="${escapeHtml(profile.name || '')}" /></div><h2 class="profile-name">${escapeHtml(profile.name || '')}</h2><div class="profile-description">${(profile.description || []).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>${links ? `<div class="profile-links">${links}</div>` : ''}`;
}

function footerHtml(config) {
    const site = config.site?.site || {};
    return `<p>© ${new Date().getFullYear()} ${escapeHtml(site.title || '')}</p>${site.tagline ? `<p class="footer-tagline">${escapeHtml(site.tagline)}</p>` : ''}`;
}

function postMeta(post) {
    return `<div class="post-meta">${escapeHtml(post.date || '')}${post.tags?.length ? ` · ${post.tags.map(escapeHtml).join(', ')}` : ''}</div>`;
}

function listPosts(def, posts) {
    return `<h1 class="page-title">${escapeHtml(def.label)}</h1><div class="post-list">${posts.length ? posts.map((post) => `<a class="post-list-item" href="/${escapeHtml(def.route)}/${escapeHtml(post.slug)}/"><h2>${escapeHtml(post.title)}</h2>${postMeta(post)}</a>`).join('') : '<p class="empty">No posts yet.</p>'}</div>`;
}

function listAlbums(def, albums, title = def.label) {
    return `<h1 class="page-title">${escapeHtml(title)}</h1><div class="gallery-grid">${albums.length ? albums.map((album) => `<a class="gallery-card" href="/${escapeHtml(def.route)}/${escapeHtml(album.slug)}/"><div class="gallery-thumb"><img src="${escapeHtml(album.images[0] || '')}" alt="${escapeHtml(album.title)}" loading="lazy" /></div><div class="gallery-card-title">${escapeHtml(album.title)}</div>${album.date ? `<div class="gallery-card-date">${escapeHtml(album.date)}</div>` : ''}</a>`).join('') : '<p class="empty">No albums yet.</p>'}</div>`;
}

function homeHtml(config, allPosts, allAlbums) {
    return (config.layout?.home?.components || []).map((section) => {
        if (section.key === 'intro') return `<section class="home-section">${section.title ? `<h2 class="section-title">${escapeHtml(section.title)}</h2>` : ''}<div class="intro-block">${(section.text || []).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}${section.linkUrl ? `<a class="intro-link" href="${escapeHtml(routePath(section.linkUrl))}">${escapeHtml(section.linkText || 'Read more')}</a>` : ''}</div></section>`;
        if (section.key === 'recentPosts') {
            const def = config.content.categories.posts;
            return `<section class="home-section"><h2 class="section-title">${escapeHtml(section.title)}</h2><div class="post-list">${allPosts.slice(0, section.limit ?? 3).map((post) => `<a class="post-list-item" href="/${escapeHtml(def.route)}/${escapeHtml(post.slug)}/"><h3>${escapeHtml(post.title)}</h3>${postMeta(post)}</a>`).join('')}</div></section>`;
        }
        if (section.key === 'featuredPhotography') {
            const def = config.content.categories.photography;
            return `<section class="home-section"><h2 class="section-title">${escapeHtml(section.title)}</h2>${listAlbums(def, allAlbums.slice(0, section.limit ?? 4), '').replace('<h1 class="page-title"></h1>', '')}</section>`;
        }
        return '';
    }).join('');
}

function pageHtml(config, page) {
    const site = config.site.site;
    const theme = config.theme?.theme || {};
    const mode = theme.default === 'light' ? 'light' : 'dark';
    const colors = theme.colors?.[mode] || {};
    const styleValues = Object.entries(colors).map(([key, value]) => `--color-${key}:${value}`);
    styleValues.push(`--navbar-opacity:${theme.navbar?.opacity ?? 1}`, `--navbar-radius:${theme.navbar?.radius ?? 0}px`);
    if (theme.background?.image) {
        const overlay = typeof theme.background.overlay === 'object' ? (theme.background.overlay[mode] ?? 0.55) : (theme.background.overlay ?? 0.55);
        const rgb = mode === 'light' ? '255,255,255' : '0,0,0';
        styleValues.push(`--bg-layers:linear-gradient(rgba(${rgb},${overlay}), rgba(${rgb},${overlay})), url("${theme.background.image}")`);
    }
    const style = styleValues.join(';');
    const canonical = `${page.siteUrl}${page.route === '/' ? '/' : page.route}`;
    return `<!DOCTYPE html>
<html lang="${escapeHtml(site.language || 'en')}" data-theme-mode="${mode}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${metaTags({ title: page.title, description: page.description, canonical, image: page.image })}
    <link rel="stylesheet" href="/public/css/style.css" />
    <link rel="icon" href="/public/images/avatar.png" />
    <style>:root{${style}}</style>
</head>
<body>
    <header id="navbar-root" class="navbar${config.navbar?.navbar?.style?.blur ? ' navbar--blur' : ''}">${navHtml(config, page.route.replace(/\/$/, '') || '/')}</header>
    <div class="layout"><aside id="profile-root" class="profile-card">${profileHtml(config)}</aside><main id="content-root" data-route="${escapeHtml(page.route.replace(/\/$/, '') || '/')}">${page.content}</main></div>
    <footer id="footer-root">${footerHtml(config)}</footer>
    <button id="theme-toggle" type="button" aria-label="切換淺色/深色模式"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg></button>
    <script type="module" src="/public/js/app.js"></script>
</body>
</html>\n`;
}

function writePage(config, page, sitemap) {
    fs.mkdirSync(path.dirname(outputFile(page.route)), { recursive: true });
    fs.writeFileSync(outputFile(page.route), pageHtml(config, page));
    sitemap.set(page.route, page.lastmod || '');
}

function main() {
    scanContent();
    const config = { site: readYaml('config/site.yaml'), profile: readYaml('config/profile.yaml'), navbar: readYaml('config/navbar.yaml'), theme: readYaml('config/theme.yaml'), layout: readYaml('config/layout.yaml'), content: readYaml('config/content.yaml') };
    const siteUrl = cleanSiteUrl(config.site.site?.url);
    const categories = config.content.categories || {};
    const indexes = new Map();
    for (const [name, def] of Object.entries(categories)) {
        const files = readManifest(def.path);
        if (def.renderer === 'article') indexes.set(name, files.filter((file) => file.endsWith('.md')).map((file) => {
            const raw = fs.readFileSync(path.join(ROOT, 'content', def.path, file), 'utf8');
            const { frontMatter, body } = splitFrontMatter(raw);
            const html = stripDuplicateTitle(renderMarkdown(body), frontMatter.title || file.replace(/\.md$/, ''));
            return { slug: file.replace(/\.md$/, ''), title: frontMatter.title || file.replace(/\.md$/, ''), date: frontMatter.date || '', tags: frontMatter.tags || [], description: frontMatter.description || summaryFromHtml(html), html, lastmod: /^\d{4}-\d{2}-\d{2}$/.test(String(frontMatter.date || '')) ? frontMatter.date : '' };
        }).sort((a, b) => String(b.date).localeCompare(String(a.date))));
        else if (def.renderer === 'gallery') indexes.set(name, files.filter((file) => /(^|\/)album\.ya?ml$/.test(file)).map((file) => {
            const meta = readYaml(path.posix.join('content', def.path, file));
            const slug = file.replace(/\/album\.ya?ml$/, '');
            return { slug, title: meta.title || slug, category: meta.category || '', camera: meta.camera || '', lens: meta.lens || '', film: meta.film || '', date: meta.date || '', images: (meta.images || []).map((image) => `/content/${def.path}/${slug}/${image}`) };
        }).sort((a, b) => String(b.date).localeCompare(String(a.date))));
    }
    fs.rmSync(DIST, { recursive: true, force: true });
    for (const name of ['public', 'config', 'content', 'engine', 'components']) fs.cpSync(path.join(ROOT, name), path.join(DIST, name), { recursive: true });
    const sitemap = new Map();
    const siteTitle = config.site.site?.title || '';
    const articlePosts = indexes.get('posts') || [];
    const photoAlbums = indexes.get('photography') || [];
    writePage(config, { route: '/', title: siteTitle, description: config.site.site?.tagline || siteTitle, content: homeHtml(config, articlePosts, photoAlbums), siteUrl }, sitemap);
    for (const [name, def] of Object.entries(categories)) {
        const entries = indexes.get(name) || [];
        writePage(config, { route: `/${def.route}/`, title: `${def.label} — ${siteTitle}`, description: def.label, content: def.renderer === 'gallery' ? listAlbums(def, entries) : listPosts(def, entries), siteUrl }, sitemap);
        if (def.renderer === 'article') for (const post of entries) writePage(config, { route: `/${def.route}/${post.slug}/`, title: `${post.title} — ${siteTitle}`, description: post.description, content: `<article class="post-detail"><a class="back-link" href="/${escapeHtml(def.route)}/">← ${escapeHtml(def.label)}</a><h1>${escapeHtml(post.title)}</h1>${postMeta(post)}<div class="post-body">${post.html}</div></article>`, siteUrl, lastmod: post.lastmod }, sitemap);
        if (def.renderer === 'gallery') {
            for (const album of entries) {
                const rows = [['Camera', album.camera], ['Lens', album.lens], ['Film', album.film], ['Date', album.date]].filter(([, value]) => value).map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join('');
                writePage(config, { route: `/${def.route}/${album.slug}/`, title: `${album.title} — ${siteTitle}`, description: `${album.title}${album.date ? ` — ${album.date}` : ''}`, image: album.images[0], content: `<article class="album-detail"><a class="back-link" href="/${escapeHtml(def.route)}/">← ${escapeHtml(def.label)}</a><h1>${escapeHtml(album.title)}</h1><dl class="album-meta">${rows}</dl><div class="album-images">${album.images.map((image) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(album.title)}" loading="lazy" />`).join('')}</div></article>`, siteUrl }, sitemap);
            }
            for (const category of new Set(entries.map((album) => album.category).filter(Boolean))) writePage(config, { route: `/${def.route}/${category}/`, title: `${category} — ${siteTitle}`, description: `${category} ${def.label}`, content: listAlbums(def, entries.filter((album) => album.category === category), category), siteUrl }, sitemap);
        }
    }
    if (fs.existsSync(path.join(ROOT, 'content', 'about.md'))) {
        const { frontMatter, body } = splitFrontMatter(fs.readFileSync(path.join(ROOT, 'content', 'about.md'), 'utf8'));
        const html = renderMarkdown(body);
        writePage(config, { route: '/about/', title: `${frontMatter.title || 'About'} — ${siteTitle}`, description: frontMatter.description || summaryFromHtml(html), content: `<article class="post-detail"><h1>${escapeHtml(frontMatter.title || 'About')}</h1><div class="post-body">${stripDuplicateTitle(html, frontMatter.title || 'About')}</div></article>`, siteUrl }, sitemap);
    }
    const urls = [...sitemap.entries()].map(([route, lastmod]) => `  <url><loc>${siteUrl}${route}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n');
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
    console.log(`[staticGenerator] wrote ${sitemap.size} page(s) to dist/`);
}

main();
