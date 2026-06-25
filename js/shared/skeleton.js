export function showSkeleton(container, { count = 7, columns = []} = {}) {
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'skeleton-row';

        columns.forEach(col => {
            const block = document.createElement('div');
            block.className = `skeleton-block`;
            block.style.left = `${col.left}px`;
            block.style.width = `${col.width}px`;
            block.style.height = `${col.height}px`;
            if (col.radius != null) {
                block.style.borderRadius = `${col.radius}px`;
            }
            row.appendChild(block);
        });
        container.appendChild(row);
    }
}