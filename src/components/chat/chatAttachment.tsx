import { useEffect, useRef, useState } from 'react';

import { useModal } from '@/context/modalContext';
import type { Attachment, Message } from '@/types/messages';
import { formatTimestamp } from '@/utils/dateUtils';
import { localBlobCache } from '@/utils/attachmentCache';
import { useGateway } from '@/context/gatewayContext';

interface ChatAttachmentProps {
  attachment: Attachment;
  msg: Message;
}

export const ChatAttachment = ({ attachment, msg }: ChatAttachmentProps) => {
  const { openModal } = useModal();
  const { user } = useGateway();

  const [loaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cacheKey = `${attachment.filename}-${attachment.size}`;
  const localBlob = localBlobCache.get(cacheKey);

  const displaySrc = localBlob || attachment.url;

  const isMine = msg.author.id === user?.id;
  const isLocal = !!localBlob || isMine;
  const shouldRender = isInView || isLocal;

  const isVideo = /\.(mp4|webm|mov)$/i.exec(attachment.filename);
  const maxWidth = 400;
  const maxHeight = 300;
  const originalWidth = attachment.width || 1600;
  const originalHeight = attachment.height || 900;

  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);

  const displayWidth = Math.floor(originalWidth * ratio);
  const displayHeight = Math.floor(originalHeight * ratio);

  useEffect(() => {
    if (isLocal) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isLocal]);

  return (
    <div ref={ref}
      className='attachment-item'
      style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
    >
      {(!loaded && !isLocal) && !isVideo && (
        <div className='attachment-placeholder loading-shimmer'>
          <span className='material-symbols-rounded' style={{ color: `var(--accent-primary)` }}>
            image
          </span>
        </div>
      )}

      {shouldRender && (
        <>
          {isVideo ? (
            <video src={displaySrc} controls className='chat-video' style={{ width: '100%', height: '100%' }}>
              <track kind='captions' />
            </video>
          ) : (
            <button
              type='button'
              className={(loaded || isLocal) ? '' : 'hidden-img'}
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
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            >
              <img
                src={displaySrc}
                alt={attachment.filename}
                className={`chat-image ${(loaded || isLocal) ? '' : 'loading'}`}
                onLoad={() => setLoaded(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          )}
        </>
      )}
    </div>
  );
};
