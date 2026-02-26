import { useEffect, useRef, useState } from 'react';

import { useModal } from '@/context/modalContext';
import type { Attachment, Message } from '@/types/messages';
import { localBlobCache } from '@/utils/attachmentCache';
import { formatTimestamp } from '@/utils/dateUtils';

interface ChatAttachmentProps {
  attachment: Attachment;
  msg: Message;
}

export const ChatAttachment = ({ attachment, msg }: ChatAttachmentProps) => {
  const { openModal } = useModal();

  const [loaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cacheKey = `${attachment.filename}-${String(attachment.size)}`;
  const localBlob = localBlobCache.get(cacheKey);
  const hasLocalMedia = localBlob !== undefined;
  const isInstant = hasLocalMedia;

  const displaySrc = localBlob ?? attachment.url;

  const isLocal = hasLocalMedia;
  const shouldRender = isInView || isLocal;

  const isVideo = /\.(mp4|webm|mov)$/i.exec(attachment.filename);
  const maxWidth = 400;
  const maxHeight = 300;
  const originalWidth = attachment.width ?? 1600;
  const originalHeight = attachment.height ?? 900;

  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);

  const displayWidth = Math.floor(originalWidth * ratio);
  const displayHeight = Math.floor(originalHeight * ratio);

  useEffect(() => {
    if (isInstant) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px' },
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [isInstant]);

  return (
    <div
      ref={ref}
      className='attachment-item'
      style={{ width: `${String(displayWidth)}px`, height: `${String(displayHeight)}px` }}
    >
      {!loaded && !hasLocalMedia && !isVideo && (
        <div className='attachment-placeholder loading-shimmer'>
          <span className='material-symbols-rounded' style={{ color: `var(--accent-primary)` }}>
            image
          </span>
        </div>
      )}
      {shouldRender && (
        <>
          {isVideo ? (
            <video
              src={displaySrc}
              controls
              className='chat-video'
              style={{ width: '100%', height: '100%' }}
            >
              <track kind='captions' />
            </video>
          ) : (
            <button
              type='button'
              className={loaded || hasLocalMedia ? '' : 'hidden-img'}
              onClick={() => {
                openModal('IMAGE_PREVIEW', {
                  src: displaySrc,
                  alt: attachment.filename,
                  width: attachment.width ?? 0,
                  height: attachment.height ?? 0,
                  author: msg.author,
                  id: attachment.id,
                  timestamp: formatTimestamp(msg.timestamp),
                });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            >
              <img
                src={displaySrc}
                alt={attachment.filename}
                className={`chat-image ${loaded || hasLocalMedia ? '' : 'loading'}`}
                onLoad={() => {
                  setLoaded(true);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          )}
        </>
      )}
    </div>
  );
};
