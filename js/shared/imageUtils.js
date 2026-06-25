
// Takes an image the user picked and shrinks it into a smaller data URL we can
// store. SVGs are kept as-is so they stay sharp at any size.
export function fileToCompressedDataURL(file, max = 512, quality = 0.85) {
    // SVG is vector — rasterizing it to a canvas throws away its sharpness.
    // Store it as-is so it stays resolution-independent and crisp at any zoom.
    if (file.type === 'image/svg+xml') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Could not load image'));
            reader.onload = () => resolve(reader.result); // data:image/svg+xml;base64,...
            reader.readAsDataURL(file);
        });
    }

    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not load image'));
        };

        img.onload = () => {
            const scale = Math.min(1, max / img.width, max / img.height);
            const targetW = Math.round(img.width * scale);
            const targetH = Math.round(img.height * scale);

            let srcCanvas = document.createElement('canvas');
            srcCanvas.width = img.width;
            srcCanvas.height = img.height;
            srcCanvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);

            let curW = img.width;
            let curH = img.height;
            while (curW > targetW * 2 && curH > targetH * 2) {
                const nextW = Math.round(curW / 2);
                const nextH = Math.round(curH / 2);
                const step = document.createElement('canvas');
                step.width = nextW;
                step.height = nextH;
                const sctx = step.getContext('2d');
                sctx.imageSmoothingEnabled = true;
                sctx.imageSmoothingQuality = 'high';
                sctx.drawImage(srcCanvas, 0, 0, nextW, nextH);
                srcCanvas = step;
                curW = nextW;
                curH = nextH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);

            let dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(dataUrl);
        };

        img.src = objectUrl;
    });
}
