import { useEffect, useRef, useState } from "react";

/**
 * Renders generated HTML inside an iframe at a fixed desktop width
 * (1280px) and scales it horizontally to fit the container while
 * allowing vertical scrolling of the full document.
 */
const BASE_W = 1280;

interface Props {
  html: string;
}

const ScaledHtmlPreview = ({ html }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(800);

  // Scale to container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (!w) return;
      const next = Math.min(w / BASE_W, 1);
      setScale((current) => Math.abs(current - next) > 0.001 ? next : current);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure iframe content height after load
  const handleLoad = () => {
    try {
      contentObserverRef.current?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const measure = () => {
        rafRef.current = null;
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight || 0,
          800,
        );
        setContentH((current) => Math.abs(current - h) > 2 ? h : current);
      };
      measure();
      // Keep observing for late renders
      const ro = new ResizeObserver(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(measure);
      });
      if (doc.body) ro.observe(doc.body);
      contentObserverRef.current = ro;
    } catch {}
  };

  useEffect(() => () => {
    contentObserverRef.current?.disconnect();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const wrappedHtml = html?.includes("<head>")
    ? html.replace(
        "<head>",
        `<head><meta name="viewport" content="width=${BASE_W}, initial-scale=1"><style>html,body{margin:0;padding:0;background:#fff;overflow-x:hidden;} *{box-sizing:border-box;}</style>`,
      )
    : `<!doctype html><html><head><meta name="viewport" content="width=${BASE_W}"><style>html,body{margin:0;background:#fff;}</style></head><body>${html || ""}</body></html>`;

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 w-full bg-neutral-100 dark:bg-neutral-900 overflow-y-auto overflow-x-hidden overscroll-contain"
    >
      <div
        className="mx-auto bg-white shadow-2xl"
        style={{
          width: BASE_W * scale,
          height: contentH * scale,
        }}
      >
        <div
          style={{
            width: BASE_W,
            height: contentH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            ref={iframeRef}
            onLoad={handleLoad}
            srcDoc={wrappedHtml}
            title="Document preview"
            className="bg-white border-0 block"
            style={{ width: BASE_W, height: contentH }}
            sandbox="allow-same-origin allow-scripts"
            scrolling="no"
          />
        </div>
      </div>
    </div>
  );
};

export default ScaledHtmlPreview;
