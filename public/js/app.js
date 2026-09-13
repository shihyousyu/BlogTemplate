import { loadAllConfig } from '../../engine/configLoader.js';
import { listAlbums } from '../../engine/contentIndex.js';
import { renderMarkdown } from '../../engine/markdownParser.js';
import { renderNavbar } from '../../components/Navbar.js';
import { renderProfile } from '../../components/Profile.js';
import { renderFooter } from '../../components/Footer.js';
import { renderHome } from '../../components/Home.js';
import { getRenderer } from '../../components/Renderer.js';
import { escapeHtml } from '../../components/util.js';

const THEME_STORAGE_KEY = 'theme-mode';

function applyTheme(config, mode){
    const theme = config.theme?.theme;
    if(!theme) return;
    const root = document.documentElement;
    const resolvedMode = mode === 'light' ? 'light' : 'dark';

    const colors = theme.colors?.[resolvedMode] || theme.colors || {};
    for(const [key, value] of Object.entries(colors))
        root.style.setProperty(`--color-${key}`, value);
    root.style.setProperty('--navbar-opacity', theme.navbar?.opacity ?? 1);
    root.style.setProperty('--navbar-radius', `${theme.navbar?.radius ?? 0}px`);
    root.dataset.themeMode = resolvedMode;

    const bg = theme.background || {};
    if(bg.image){
        const overlayConfig = bg.overlay;
        const overlay = (overlayConfig && typeof overlayConfig === 'object')
            ? (overlayConfig[resolvedMode] ?? 0.55)
            : (overlayConfig ?? 0.55);
        const scrimRgb = resolvedMode === 'light' ? '255,255,255' : '0,0,0';
        root.style.setProperty(
            '--bg-layers',
            `linear-gradient(rgba(${scrimRgb},${overlay}), rgba(${scrimRgb},${overlay})), url("${bg.image}")`
        );
    }
	else root.style.setProperty('--bg-layers', 'none');
}

function getStoredThemeMode(){
    try{
        return window.localStorage.getItem(THEME_STORAGE_KEY);
    }catch{
        return null;
    }
}

function storeThemeMode(mode){
    try{
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }catch{
        // Storage unavailable (private mode, etc.) — theme just won't persist.
    }
}

function initThemeToggle(config){
    const toggle = document.getElementById('theme-toggle');
    if(!toggle) return;

    const defaultMode = config.theme?.theme?.default === 'light' ? 'light' : 'dark';
    let mode = getStoredThemeMode() || defaultMode;
    applyTheme(config, mode);

    toggle.addEventListener('click', () => {
        mode = mode === 'light' ? 'dark' : 'light';
        applyTheme(config, mode);
        storeThemeMode(mode);
    });
}

function currentPath(){
    const hash = window.location.hash || '#/';
    return hash.slice(1) || '/';
}

function findNavItem(items, url){
    for(const item of items || []){
        if(item.url === url) return item;
        if(item.children){
            const child = item.children.find((c) => c.url === url);
            if(child) return child;
        }
    }
    return null;
}

function renderNotFound(container){
    container.innerHTML = `
        <h1 class="page-title">Not found</h1>
        <p class="empty">Nothing lives at this address yet.</p>
        <a class="back-link" href="#/">← Home</a>
    `;
}

async function renderPlainPage(container, title){
    if(title === 'About'){
        const res = await fetch('content/about.md');
        const raw = await res.text();
        container.innerHTML = `
            <h1 class="page-title">About</h1>
            <div class="post-body">${renderMarkdown(raw)}</div>
        `;
        return;
    }
    container.innerHTML = `
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="empty">This page has no content category attached — add markup here or wire it up to its own content type.</p>
    `;
}

async function resolveRoute(config, path){
    const contentRoot = document.getElementById('content-root');
    const siteTitle = config.site?.site?.title || '';
    const categories = config.content?.categories || {};

    const setTitle = (parts) => {
        document.title = parts.filter(Boolean).join(' — ');
    };

    if(path === '/' ){
        setTitle([siteTitle]);
        await renderHome(contentRoot, config);
        window.scrollTo(0, 0);
        return;
    }

    const segments = path.split('/').filter(Boolean);
    const catEntry = Object.entries(categories).find(([, def]) => def.route === segments[0]);

    if(catEntry){
        const [, def] = catEntry;
        const renderer = getRenderer(def.renderer);

        if(def.renderer === 'gallery'){
            if (segments.length === 1){
                setTitle([def.label, siteTitle]);
                await renderer.list(contentRoot, { categoryDef: def, config });
                window.scrollTo(0, 0);
                return;
            }

            const rest = segments.slice(1).join('/');
            const albums = await listAlbums(`content/${def.path}`);

            const exact = albums.find((a) => a.slug === rest);
            if(exact){
                setTitle([exact.title, siteTitle]);
                await renderer.detail(contentRoot, { categoryDef: def, slug: rest });
                window.scrollTo(0, 0);
                return;
            }

            const hasCategory = albums.some((a) => a.category === rest);
            if(hasCategory){
                const navChild = findNavItem(config.navbar?.navbar?.items, `/${segments.join('/')}`);
                const filterTitle = navChild ? navChild.name : rest;
                setTitle([filterTitle, siteTitle]);
                await renderer.list(contentRoot, { categoryDef: def, config, filter: rest, filterTitle });
                window.scrollTo(0, 0);
                return;
            }

            renderNotFound(contentRoot);
            return;
        }

        if (segments.length === 1){
            setTitle([def.label, siteTitle]);
            await renderer.list(contentRoot, { categoryDef: def, config });
        }else{
            const slug = segments.slice(1).join('/');
            setTitle([siteTitle]);
            await renderer.detail(contentRoot, { categoryDef: def, slug });
        }
        window.scrollTo(0, 0);
        return;
    }

    const navItem = findNavItem(config.navbar?.navbar?.items, `/${segments.join('/')}`);
    if(navItem){
        setTitle([navItem.name, siteTitle]);
        await renderPlainPage(contentRoot, navItem.name);
        window.scrollTo(0, 0);
        return;
    }

    renderNotFound(contentRoot);
    window.scrollTo(0, 0);
}

async function boot(){
    const config = await loadAllConfig();
    initThemeToggle(config);
    document.documentElement.lang = config.site?.site?.language || 'en';

    const navbarRoot = document.getElementById('navbar-root');
    const profileRoot = document.getElementById('profile-root');
    const footerRoot = document.getElementById('footer-root');

    renderProfile(profileRoot, config);
    renderFooter(footerRoot, config);
    renderNavbar(navbarRoot, config, currentPath());
    await resolveRoute(config, currentPath());

    window.addEventListener('hashchange', async () => {
        renderNavbar(navbarRoot, config, currentPath());
        await resolveRoute(config, currentPath());
    });
}

boot().catch((err) => {
    console.error('Failed to start app:', err);
    const contentRoot = document.getElementById('content-root');
    if(contentRoot) contentRoot.innerHTML = `<p class="empty">Failed to load the site. Check the console for details.</p>`;
});
