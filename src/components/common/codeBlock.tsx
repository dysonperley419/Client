import { useEffect, useRef, useState } from 'react';

import { useShiki } from '@/hooks/useShiki';

interface Props {
  children: string;
  language?: string;
  theme?: string;
}

export default function CodeBlock({ children, language, theme = 'github-dark' }: Props) {
  const [rendered, setRendered] = useState<{ signature: string; html: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { highlight } = useShiki();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const normalizedLanguage = language ? language.trim().toLowerCase().split(/\s+/)[0] : undefined;
  const signature = `${theme}\0${normalizedLanguage ?? ''}\0${children}`;
  const html = rendered?.signature === signature ? rendered.html : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !html) {
          void highlight(children, normalizedLanguage, theme).then((nextHtml) => {
            setRendered({ signature, html: nextHtml });
          });
        }
      },
      { threshold: 0.1 },
    );
    observerRef.current.observe(el);

    return () => observerRef.current?.disconnect();
  }, [children, normalizedLanguage, theme, html, highlight, signature]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html ?? '' }} />;
}
