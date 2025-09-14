import React, { useEffect, useRef, useState } from 'react';

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
}

const CANVAS_DEFAULT_SIZE = 600;

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageInfo }) => {
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

    // Обработчики событий для панорамирования и зума
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
            isDraggingRef.current = true;
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
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

        canvas.addEventListener('wheel', onWheel);
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

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

        // const fitScale = Math.min(CANVAS_DEFAULT_SIZE / imgWidth, CANVAS_DEFAULT_SIZE / imgHeight);

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
                cursor: isDraggingRef.current ? 'grabbing' : 'grab',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default ImageCanvas;