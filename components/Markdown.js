import {listPosts, getPost} from '../engine/contentIndex.js';
import { escapeHtml } from './util.js';

export async function renderList(container, { categoryDef }){
    container.innerHTML = '';

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = categoryDef.label;
    container.appendChild(title);

    const posts = await listPosts(`content/${categoryDef.path}`);
    const list = document.createElement('div');
    list.className = 'post-list';

    if(!posts.length) list.innerHTML = '<p class="empty">No posts yet — add a .md file under content/posts/.</p>';
    else{
        for(const post of posts){
            const item = document.createElement('a');
            item.className = 'post-list-item';
            item.href = `#/${categoryDef.route}/${post.slug}`;
            item.innerHTML = `
                <h2>${escapeHtml(post.title)}</h2>
                <div class="post-meta">${escapeHtml(post.date)}${post.tags.length ? ' · ' + post.tags.map(escapeHtml).join(', ') : ''}</div>
            `;
            list.appendChild(item);
        }
    }

    container.appendChild(list);
}

export async function renderDetail(container, {categoryDef, slug}){
    const post = await getPost(`content/${categoryDef.path}`, slug);
    container.innerHTML = '';

    if(!post){
        container.innerHTML = `
            <a class="back-link" href="#/${categoryDef.route}">← ${escapeHtml(categoryDef.label)}</a>
            <p class="empty">That post could not be found.</p>
        `;
        return;
    }

    const article = document.createElement('article');
    article.className = 'post-detail';
    article.innerHTML = `
        <a class="back-link" href="#/${categoryDef.route}">← ${escapeHtml(categoryDef.label)}</a>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">${escapeHtml(post.date)}${post.tags.length ? ' · ' + post.tags.map(escapeHtml).join(', ') : ''}</div>
        <div class="post-body">${post.html}</div>
    `;
    container.appendChild(article);
}
