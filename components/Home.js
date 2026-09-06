import {listPosts, listAlbums} from '../engine/contentIndex.js';
import escapeHtml from './util.js';

const registry = {};

export function registerHomeComponent(key, fn){
    registry[key] = fn;
}

export async function renderHome(container, config){
    container.innerHTML = '';
    const sections = config.layout?.home?.components || [];

    for(const section of sections){
        const el = document.createElement('section');
        el.className = 'home-section';
        const fn = registry[section.key];
        if(fn) await fn(el, section, config);
        else el.innerHTML = `<p class="empty">Unknown home component: ${escapeHtml(section.key)}</p>`;
        container.appendChild(el);
    }
}

registerHomeComponent('intro', async (el, section) => {
    const lines = section.text || [];
    el.innerHTML = (
        (section.title ? `<h2 class="section-title">${escapeHtml(section.title)}</h2>` : '') +
        `<div class="intro-block">` +
        lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('') +
        (section.linkUrl
            ? `<a class="intro-link" href="#${section.linkUrl}">${escapeHtml(section.linkText || 'Read more')}</a>`
            : '') +
        `</div>`
    );
});

registerHomeComponent('recentPosts', async (el, section, config) => {
    const postsDef = config.content.categories.posts;
    const posts = (await listPosts(`content/${postsDef.path}`)).slice(0, section.limit ?? 3);
    el.innerHTML = `<h2 class="section-title">${escapeHtml(section.title)}</h2>` + (
        posts.length
            ? `<div class="post-list">${posts.map((p) => `
                    <a class="post-list-item" href="#/${postsDef.route}/${p.slug}">
                        <h3>${escapeHtml(p.title)}</h3>
                        <div class="post-meta">${escapeHtml(p.date)}</div>
                    </a>`).join('')}</div>`
            : `<p class="empty">No posts yet.</p>`
    );
});

registerHomeComponent('featuredPhotography', async (el, section, config) => {
    const photoDef = config.content.categories.photography;
    const albums = (await listAlbums(`content/${photoDef.path}`)).slice(0, section.limit ?? 4);
    el.innerHTML = `<h2 class="section-title">${escapeHtml(section.title)}</h2>` + (
        albums.length
            ? `<div class="gallery-grid">${albums.map((a) => `
                    <a class="gallery-card" href="#/${photoDef.route}/${a.slug}">
                        <div class="gallery-thumb"><img src="${escapeHtml(a.images[0] || '')}" alt="${escapeHtml(a.title)}" loading="lazy" /></div>
                        <div class="gallery-card-title">${escapeHtml(a.title)}</div>
                        ${a.date ? `<div class="gallery-card-date">${escapeHtml(a.date)}</div>` : ''}
                    </a>`).join('')}</div>`
            : `<p class="empty">No albums yet.</p>`
    );
});
