
import { useEffect, useRef, useState, type FC } from 'react';
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
}

const CANVAS_DEFAULT_SIZE = 600;

const ImageCanvas: FC<ImageCanvasProps> = ({ imageInfo, activeTool, onColorPick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgLoaded, setImgLoaded] = useState(false);

    // useRef для интерактивности
    const panRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    const [redrawTrigger, setRedrawTrigger] = useState(0);
    const redraw = () => setRedrawTrigger(v => v + 1);

    // Обработка загрузки изображения
    useEffect(() => {
        setImgLoaded(false);
        if (!imageInfo) return;

        if (imageInfo.imageElement) {
            if (imageInfo.imageElement.complete) {
                setImgLoaded(true);
            } else {
                const onLoad = () => setImgLoaded(true);
                imageInfo.imageElement.addEventListener('load', onLoad);
                return () => {
                    imageInfo.imageElement!.removeEventListener('load', onLoad);
                };
            }
        } else {
            setImgLoaded(true);
        }
    }, [imageInfo]);

    // Обработчики событий для панорамирования, зума и пипетки
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const scaleAmount = e.deltaY * -0.001;
            zoomRef.current = Math.max(0.1, zoomRef.current + scaleAmount);
            redraw();
        };

        const onMouseDown = (e: MouseEvent) => {
            if (activeTool !== 'hand') return;
            isDraggingRef.current = true;
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || activeTool !== 'hand') return;
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            panRef.current.x += dx;
            panRef.current.y += dy;
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
            redraw();
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
            canvas.style.cursor = 'grab';
        };

        const onMouseClick = (e: MouseEvent) => {
            if (activeTool !== 'eyedropper' || !imageInfo?.imageElement) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const imgX = Math.round((mouseX - panRef.current.x * zoomRef.current) / zoomRef.current);
            const imgY = Math.round((mouseY - panRef.current.y * zoomRef.current) / zoomRef.current);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let imageData;
            try {
                imageData = ctx.getImageData(imgX, imgY, 1, 1);
            } catch (error) {
                console.error("Failed to get pixel data:", error);
                return;
            }

            const [r, g, b] = imageData.data;
            const finalR = imageInfo.depth === 7 ? Math.round((r / 127) * 255) : r;
            const finalG = imageInfo.depth === 7 ? Math.round((g / 127) * 255) : g;
            const finalB = imageInfo.depth === 7 ? Math.round((b / 127) * 255) : b;

            const rgb = { r: finalR, g: finalG, b: finalB };
            const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
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
        };

        canvas.addEventListener('wheel', onWheel);
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onMouseClick);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('click', onMouseClick);
        };
    }, [activeTool, imageInfo, onColorPick, panRef, zoomRef]);

    // Отрисовка
    useEffect(() => {
        if (!imageInfo || !imgLoaded) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_DEFAULT_SIZE;
        canvas.height = CANVAS_DEFAULT_SIZE;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;

        const imgWidth = imageInfo.imageElement?.naturalWidth;
        const imgHeight = imageInfo.imageElement?.naturalHeight;

        if (!imgWidth || !imgHeight) return;

        ctx.save();
        ctx.translate(CANVAS_DEFAULT_SIZE / 2, CANVAS_DEFAULT_SIZE / 2);
        ctx.scale(zoomRef.current, zoomRef.current);
        ctx.translate(panRef.current.x, panRef.current.y);
        ctx.translate(-imgWidth / 2, -imgHeight / 2);

        if (imageInfo.imageElement) {
            ctx.drawImage(imageInfo.imageElement, 0, 0, imgWidth, imgHeight);
        }
        ctx.restore();
    }, [imageInfo, imgLoaded, redrawTrigger]);

    return (
        <div
            style={{
                border: '1px solid #ccc',
                margin: '0 auto',
                width: CANVAS_DEFAULT_SIZE,
                height: CANVAS_DEFAULT_SIZE,
                overflow: 'hidden',
                cursor: activeTool === 'hand'
                    ? (isDraggingRef.current ? 'grabbing' : 'grab')
                    : 'crosshair',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default ImageCanvas;