let activePanels = [];
let outsideClickBound = false;

function isPathActive(currentPath, itemUrl){
    if(itemUrl === '/') return currentPath === '/' || currentPath === '';
    return currentPath === itemUrl || currentPath.startsWith(`${itemUrl}/`);
}

function closeAllPanels(){
    for(const panel of activePanels) panel.style.display = 'none';
}

function bindOutsideClickOnce(){
    if(outsideClickBound) return;
    outsideClickBound = true;
    document.addEventListener('click', (event) => {
        for(const panel of activePanels){
            if(panel.style.display !== 'block') continue;
            const trigger = panel.__trigger;
            if(trigger && (trigger.contains(event.target) || panel.contains(event.target))) continue;
            panel.style.display = 'none';
        }
    });
    window.addEventListener('resize', closeAllPanels);
    window.addEventListener('scroll', closeAllPanels, true);
}

export function renderNavbar(container, config, path){
    const navbar = config.navbar?.navbar;

    for(const panel of activePanels) panel.remove();
    activePanels = [];

    container.innerHTML = '';
    if(!navbar || navbar.enabled === false) return;

    container.classList.add('navbar');
    container.classList.toggle('navbar--blur', !!navbar.style?.blur);
    container.classList.toggle('navbar--scroll-x', navbar.scroll?.direction === 'horizontal');

    const list = document.createElement('div');
    list.className = 'navbar-list';

    for(const item of navbar.items || []){
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        const childActive = hasChildren && item.children.some((c) => isPathActive(path, c.url));
        const active = isPathActive(path, item.url) || childActive;

        const wrap = document.createElement('div');
        wrap.className = 'navbar-item' + (hasChildren ? ' has-children' : '');

        const link = document.createElement('a');
        link.className = 'navbar-link' + (active ? ' is-active' : '');
        link.href = `#${item.url}`;
        link.textContent = item.name;
        wrap.appendChild(link);

        if(hasChildren){
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'navbar-caret';
            toggle.setAttribute('aria-label', `Toggle ${item.name} submenu`);
            toggle.textContent = '⌄';
            wrap.appendChild(toggle);

            const panel = document.createElement('div');
            panel.className = 'navbar-dropdown';
            panel.style.display = 'none';
            panel.__trigger = wrap;

            for(const child of item.children){
                const childLink = document.createElement('a');
                childLink.className = 'navbar-dropdown-link' + (isPathActive(path, child.url) ? ' is-active' : '');
                childLink.href = `#${child.url}`;
                childLink.textContent = child.name;
                panel.appendChild(childLink);
            }

            document.body.appendChild(panel);
            activePanels.push(panel);

            const openPanel = () => {
                const rect = wrap.getBoundingClientRect();
                panel.style.position = 'fixed';
                panel.style.top = `${rect.bottom + 8}px`;
                panel.style.left = `${rect.left}px`;
                panel.style.display = 'block';
            };

            toggle.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = panel.style.display === 'block';
                closeAllPanels();
                if (!isOpen) openPanel();
            });
        }

        list.appendChild(wrap);
    }

    container.appendChild(list);
    bindOutsideClickOnce();
}
