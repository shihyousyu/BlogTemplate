import * as Markdown from './Markdown.js';
import * as Gallery from './Gallery.js';

const registry = {
    article: { list: Markdown.renderList, detail: Markdown.renderDetail },
    gallery: { list: Gallery.renderList, detail: Gallery.renderDetail },
};

export function registerRenderer(name, impl){
    registry[name] = impl;
}

export function getRenderer(name){
    const impl = registry[name];
    if (!impl) throw new Error(`No renderer registered for type "${name}"`);
    return impl;
}
