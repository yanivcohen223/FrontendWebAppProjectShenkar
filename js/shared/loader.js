// loader.js — shared loading indicator used across pages on initial load.

export function createLoader(text = 'Loading…', className = '') {
    const wrap = document.createElement('div');
    wrap.className = className ? `loader ${className}` : 'loader';

    const spinner = document.createElement('div');
    spinner.className = 'loader-spinner';
    wrap.appendChild(spinner);

    if (text) {
        const label = document.createElement('p');
        label.className = 'loader-text';
        label.textContent = text;
        wrap.appendChild(label);
    }
    return wrap;
}

// Replaces a container's contents with the loader. Returns the loader node.
export function showLoader(container, { text = 'Loading…', className = '' } = {}) {
    if (!container) return null;
    container.innerHTML = '';
    const loader = createLoader(text, className);
    container.appendChild(loader);
    return loader;
}

export function showOverlayLoader(container, text = 'Loading…') {
    if (!container) return () => {};
    const loader = createLoader(text, 'loader--overlay');
    container.appendChild(loader);
    return () => loader.remove();
}
