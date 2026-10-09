import { loadAllConfig } from '../../engine/configLoader.js';
import { listAlbums, getPost } from '../../engine/contentIndex.js';
import { renderMarkdown, splitFrontMatter } from '../../engine/markdownParser.js';
import { renderNavbar } from '../../components/Navbar.js';
import { renderProfile } from '../../components/Profile.js';
import { renderFooter } from '../../components/Footer.js';
import { renderHome } from '../../components/Home.js';
import { getRenderer } from '../../components/Renderer.js';
import { escapeHtml } from '../../components/util.js';

const THEME_STORAGE_KEY = 'theme-mode';

function applyTheme(config, mode) {
    const theme = config.theme?.theme;
    if (!theme) return;
    const resolved = mode === 'light' ? 'light' : 'dark';
    for (const [key, value] of Object.entries(theme.colors?.[resolved] || theme.colors || {})) document.documentElement.style.setProperty(`--color-${key}`, value);
    document.documentElement.style.setProperty('--navbar-opacity', theme.navbar?.opacity ?? 1);
    document.documentElement.style.setProperty('--navbar-radius', `${theme.navbar?.radius ?? 0}px`);
    document.documentElement.dataset.themeMode = resolved;
    if (theme.background?.image) {
        const overlay = typeof theme.background.overlay === 'object' ? (theme.background.overlay[resolved] ?? 0.55) : (theme.background.overlay ?? 0.55);
        const rgb = resolved === 'light' ? '255,255,255' : '0,0,0';
        document.documentElement.style.setProperty('--bg-layers', `linear-gradient(rgba(${rgb},${overlay}), rgba(${rgb},${overlay})), url("${theme.background.image}")`);
    }
}

function initThemeToggle(config) {
    const defaultMode = config.theme?.theme?.default === 'light' ? 'light' : 'dark';
    let mode;
    try { mode = localStorage.getItem(THEME_STORAGE_KEY) || defaultMode; } catch { mode = defaultMode; }
    applyTheme(config, mode);
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        mode = mode === 'light' ? 'dark' : 'light';
        applyTheme(config, mode);
        try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* optional */ }
    });
}

function normalisePath(path = window.location.pathname) {
    const clean = `/${String(path).replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/');
    return clean === '/' ? '/' : clean;
}

function findNavItem(items, url) {
    for (const item of items || []) {
        if (item.url === url) return item;
        const child = item.children?.find((candidate) => candidate.url === url);
        if (child) return child;
    }
    return null;
}

function renderNotFound(root) {
    root.innerHTML = '<h1 class="page-title">Not found</h1><p class="empty">Nothing lives at this address yet.</p><a class="back-link" href="/">← Home</a>';
}

async function renderPlainPage(root, title) {
    if (title !== 'About') {
        root.innerHTML = `<h1 class="page-title">${escapeHtml(title)}</h1><p class="empty">This page has no content category attached.</p>`;
        return;
    }
    const res = await fetch('/content/about.md');
    if (!res.ok) throw new Error('Could not load About page');
    const { frontMatter, body } = splitFrontMatter(await res.text());
    root.innerHTML = `<article class="post-detail"><h1>${escapeHtml(frontMatter.title || title)}</h1><div class="post-body">${renderMarkdown(body)}</div></article>`;
}

async function resolveRoute(config, path, { scroll = true } = {}) {
    const root = document.getElementById('content-root');
    const siteTitle = config.site?.site?.title || '';
    const setTitle = (parts) => { document.title = parts.filter(Boolean).join(' — '); };
    if (path === '/') {
        setTitle([siteTitle]);
        await renderHome(root, config);
    } else {
        const segments = path.split('/').filter(Boolean);
        const entry = Object.entries(config.content?.categories || {}).find(([, def]) => def.route === segments[0]);
        if (!entry) {
            const navItem = findNavItem(config.navbar?.navbar?.items, `/${segments.join('/')}`);
            if (navItem) { setTitle([navItem.name, siteTitle]); await renderPlainPage(root, navItem.name); }
            else renderNotFound(root);
        } else {
            const [, def] = entry;
            const renderer = getRenderer(def.renderer);
            if (def.renderer === 'gallery') {
                if (segments.length === 1) { setTitle([def.label, siteTitle]); await renderer.list(root, { categoryDef: def, config }); }
                else {
                    const rest = segments.slice(1).join('/');
                    const albums = await listAlbums(`content/${def.path}`);
                    const exact = albums.find((album) => album.slug === rest);
                    if (exact) { setTitle([exact.title, siteTitle]); await renderer.detail(root, { categoryDef: def, slug: rest }); }
                    else if (albums.some((album) => album.category === rest)) {
                        const navItem = findNavItem(config.navbar?.navbar?.items, `/${segments.join('/')}`);
                        setTitle([navItem?.name || rest, siteTitle]);
                        await renderer.list(root, { categoryDef: def, config, filter: rest, filterTitle: navItem?.name || rest });
                    } else renderNotFound(root);
                }
            } else if (segments.length === 1) { setTitle([def.label, siteTitle]); await renderer.list(root, { categoryDef: def, config }); }
            else {
                const slug = segments.slice(1).join('/');
                const post = await getPost(`content/${def.path}`, slug);
                setTitle([post?.title || def.label, siteTitle]);
                await renderer.detail(root, { categoryDef: def, slug });
            }
        }
    }
    if (scroll) window.scrollTo(0, 0);
}

function redirectLegacyHash() {
    if (!window.location.hash.startsWith('#/')) return false;
    const path = normalisePath(window.location.hash.slice(1));
    window.location.replace(`${path === '/' ? '/' : `${path}/`}${window.location.search}`);
    return true;
}

function isInternalClick(event, anchor) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return false;
    const url = new URL(anchor.href, location.href);
    return url.origin === location.origin && !url.hash;
}

async function boot() {
    if (redirectLegacyHash()) return;
    const config = await loadAllConfig();
    document.documentElement.lang = config.site?.site?.language || 'en';
    initThemeToggle(config);
    const navbar = document.getElementById('navbar-root');
    renderNavbar(navbar, config, normalisePath());
    renderProfile(document.getElementById('profile-root'), config);
    renderFooter(document.getElementById('footer-root'), config);
    const root = document.getElementById('content-root');
    if (root?.dataset.route !== normalisePath()) await resolveRoute(config, normalisePath(), { scroll: false });
    const navigate = async (path) => {
        const next = normalisePath(path);
        renderNavbar(navbar, config, next);
        await resolveRoute(config, next);
    };
    document.addEventListener('click', async (event) => {
        const anchor = event.target.closest('a[href]');
        if (!anchor || !isInternalClick(event, anchor)) return;
        const url = new URL(anchor.href, location.href);
        event.preventDefault();
        const path = normalisePath(url.pathname);
        if (path !== normalisePath()) history.pushState({}, '', `${path === '/' ? '/' : `${path}/`}${url.search}`);
        await navigate(path);
    });
    window.addEventListener('popstate', () => navigate(normalisePath()));
}

boot().catch((error) => {
    console.error('Failed to start app:', error);
    const root = document.getElementById('content-root');
    if (root && !root.innerHTML.trim()) root.innerHTML = '<p class="empty">Failed to load the site. Check the console for details.</p>';
});
