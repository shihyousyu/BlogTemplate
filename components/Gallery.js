import {listAlbums, getAlbum} from '../engine/contentIndex.js';
import { escapeHtml } from './util.js';

export async function renderList(container, {categoryDef, filter, filterTitle}){
    container.innerHTML = '';

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = filterTitle || categoryDef.label;
    container.appendChild(title);

    let albums = await listAlbums(`content/${categoryDef.path}`);
    if(filter) albums = albums.filter((a) => a.category === filter);

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';

    if(!albums.length) grid.innerHTML = '<p class="empty">No albums yet — add a folder under content/photography/.</p>';
    else{
        for(const album of albums){
            const card = document.createElement('a');
            card.className = 'gallery-card';
            card.href = `#/${categoryDef.route}/${album.slug}`;
            card.innerHTML = `
                <div class="gallery-thumb">
                    <img src="${escapeHtml(album.images[0] || '')}" alt="${escapeHtml(album.title)}" loading="lazy" />
                </div>
                <div class="gallery-card-title">${escapeHtml(album.title)}</div>
                ${album.date ? `<div class="gallery-card-date">${escapeHtml(album.date)}</div>` : ''}
            `;
            grid.appendChild(card);
        }
    }
    container.appendChild(grid);
}

export async function renderDetail(container, {categoryDef, slug}){
    const album = await getAlbum(`content/${categoryDef.path}`, slug);
    container.innerHTML = '';

    if(!album){
        container.innerHTML = `
            <a class="back-link" href="#/${categoryDef.route}">← ${escapeHtml(categoryDef.label)}</a>
            <p class="empty">That album could not be found.</p>
        `;
        return;
    }

    const metaRows = [
        ['Camera', album.camera],
        ['Lens', album.lens],
        ['Film', album.film],
        ['Date', album.date],
    ].filter(([, value]) => value);

    const article = document.createElement('article');
    article.className = 'album-detail';
    article.innerHTML = `
        <a class="back-link" href="#/${categoryDef.route}">← ${escapeHtml(categoryDef.label)}</a>
        <h1>${escapeHtml(album.title)}</h1>
        <dl class="album-meta">
            ${metaRows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`).join('')}
        </dl>
        <div class="album-images">
            ${album.images.map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(album.title)}" loading="lazy" />`).join('')}
        </div>
    `;
    container.appendChild(article);

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `<img src="" alt="" />`;
    container.appendChild(lightbox);
    const lightboxImg = lightbox.querySelector('img');

    article.querySelectorAll('.album-images img').forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.classList.add('active');
        });
    });

    lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
        lightboxImg.src = '';
    });
}
