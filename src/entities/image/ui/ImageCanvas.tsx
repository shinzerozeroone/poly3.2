import React, { useEffect, useRef, useState, type FC } from 'react';
import { type ColorInfo, rgbToXyz, xyzToLab, labToLch, labToOklch } from '../../color/model/colorUtils';

export interface ImageInfo {
    width: number;
    height: number;
    depth: number;
    imageData?: ImageData;
    imageElement?: HTMLImageElement;
    scale?: number;
    scaledImageData?: ImageData;
    format?: string;
}

interface ImageCanvasProps {
    imageInfo: ImageInfo | null;
    activeTool: 'hand' | 'eyedropper';
    onColorPick: (color: ColorInfo, isAltPressed: boolean) => void;
    compositeImage?: HTMLImageElement | null;
}

const CANVAS_DEFAULT_SIZE = 600;

const ImageCanvas: FC<ImageCanvasProps> = ({
    imageInfo,
    activeTool,
    onColorPick,
    compositeImage,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Панорамирование и масштабирование (зум)
    const panRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const isDraggingRef = useRef(false);
    const lastMousePosition = useRef({ x: 0, y: 0 });

    const [redrawTrigger, setRedrawTrigger] = useState(0);
    const redraw = () => setRedrawTrigger((v) => v + 1);

    useEffect(() => {
        setImgLoaded(false);
        const imgToLoad = compositeImage || imageInfo?.imageElement;
        if (!imgToLoad) return;

        if (imgToLoad.complete) {
            setImgLoaded(true);
        } else {
            const onLoad = () => setImgLoaded(true);
            imgToLoad.addEventListener('load', onLoad);
            return () => imgToLoad.removeEventListener('load', onLoad);
        }
    }, [imageInfo, compositeImage]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const scaleChange = e.deltaY * -0.001;
            zoomRef.current = Math.min(Math.max(zoomRef.current + scaleChange, 0.1), 6);
            redraw();
        };

        const onMouseDown = (e: MouseEvent) => {
            if (activeTool !== 'hand') return;
            isDraggingRef.current = true;
            lastMousePosition.current = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || activeTool !== 'hand') return;
            const dx = e.clientX - lastMousePosition.current.x;
            const dy = e.clientY - lastMousePosition.current.y;
            panRef.current.x += dx;
            panRef.current.y += dy;
            lastMousePosition.current = { x: e.clientX, y: e.clientY };
            redraw();
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
            canvas.style.cursor = 'grab';
        };

        const onClick = (e: MouseEvent) => {
            if (activeTool !== 'eyedropper') return;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const imgX = Math.round((mouseX - panRef.current.x) / zoomRef.current);
            const imgY = Math.round((mouseY - panRef.current.y) / zoomRef.current);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            try {
                const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
                const [r, g, b, a] = pixel;
                if (a === 0) return; // Прозрачный пиксель
                const rgb = { r, g, b };
                const xyz = rgbToXyz(r, g, b);
                const lab = xyzToLab(xyz.x, xyz.y, xyz.z);
                const lch = labToLch(lab.l, lab.a, lab.b);
                const oklch = labToOklch(lab.l, lab.a, lab.b);
                const colorInfo: ColorInfo = {
                    x: imgX,
                    y: imgY,
                    rgb,
                    xyz,
                    lab,
                    lch,
                    oklch,
                };
                onColorPick(colorInfo, e.altKey || e.ctrlKey || e.shiftKey);
            } catch {
                // Игнорировать ошибки вне области
            }
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onClick);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('click', onClick);
        };
    }, [activeTool, onColorPick]);

    useEffect(() => {
        if ((!imageInfo && !compositeImage) || !imgLoaded) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_DEFAULT_SIZE;
        canvas.height = CANVAS_DEFAULT_SIZE;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;

        const img = compositeImage || imageInfo?.imageElement;
        if (!img?.naturalWidth || !img?.naturalHeight) return;

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        ctx.save();
        ctx.translate(CANVAS_DEFAULT_SIZE / 2, CANVAS_DEFAULT_SIZE / 2);
        ctx.translate(panRef.current.x, panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        ctx.translate(-imgWidth / 2, -imgHeight / 2);
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
        ctx.restore();
    }, [imageInfo, compositeImage, imgLoaded, redrawTrigger]);

    return (
        <div
            style={{
                border: '1px solid #ccc',
                margin: '0 auto',
                width: CANVAS_DEFAULT_SIZE,
                height: CANVAS_DEFAULT_SIZE,
                overflow: 'hidden',
                cursor: activeTool === 'hand' ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'crosshair',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default ImageCanvas;
