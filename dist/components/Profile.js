import { getIcon } from './icons.js';

export function renderProfile(container, config){
    const profile = config.profile?.profile;
    container.innerHTML = '';
    if(!profile) return;

    container.className = 'profile-card';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'profile-avatar-frame';
    const avatar = document.createElement('img');
    avatar.className = 'profile-avatar';
    avatar.src = profile.avatar?.image || '';
    avatar.alt = profile.name || '';
    avatarWrap.appendChild(avatar);
    container.appendChild(avatarWrap);

    const name = document.createElement('h2');
    name.className = 'profile-name';
    name.textContent = profile.name || '';
    container.appendChild(name);

    const description = document.createElement('div');
    description.className = 'profile-description';
    for(const line of profile.description || []){
        const p = document.createElement('p');
        p.textContent = line;
        description.appendChild(p);
    }
    container.appendChild(description);

    const links = profile.links || [];
    if(links.length){
        const list = document.createElement('div');
        list.className = 'profile-links';
        for(const link of links){
            const a = document.createElement('a');
            a.className = 'profile-link-btn';
            a.href = link.url || '#';
            a.title = link.name || '';
            a.setAttribute('aria-label', link.name || '');
            a.innerHTML = getIcon(link.icon);
            if(/^https?:\/\//.test(link.url || '')){
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            list.appendChild(a);
        }
        container.appendChild(list);
    }
}
