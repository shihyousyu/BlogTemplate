export function renderFooter(container, config){
    const site = config.site?.site;
    container.innerHTML = '';
    if(!site) return;

    const year = new Date().getFullYear();
    const p = document.createElement('p');
    p.textContent = `© ${year} ${site.title || ''}`;
    container.appendChild(p);

    if(site.tagline){
        const tagline = document.createElement('p');
        tagline.className = 'footer-tagline';
        tagline.textContent = site.tagline;
        container.appendChild(tagline);
    }
}
