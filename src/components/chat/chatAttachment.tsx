import { useState } from 'react';

import { useModal } from '@/context/modalContext';
import type { Attachment, Message } from '@/types/messages';
import { formatTimestamp } from '@/utils/dateUtils';

interface ChatAttachmentProps {
  attachment: Attachment;
  msg: Message;
}

export const ChatAttachment = ({ attachment, msg }: ChatAttachmentProps) => {
  const { openModal } = useModal();

  const [loaded, setLoaded] = useState(false);
  const isVideo = /\.(mp4|webm|mov)$/i.exec(attachment.filename);
  const maxWidth = 400;
  const maxHeight = 300;
  const originalWidth = attachment.width || 1600;
  const originalHeight = attachment.height || 900;

  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);

  const displayWidth = Math.floor(originalWidth * ratio);
  const displayHeight = Math.floor(originalHeight * ratio);

  return (
    <div
      key={attachment.id}
      className='attachment-item'
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
      }}
    >
      {!loaded && !isVideo && (
        <div className='attachment-placeholder loading-shimmer'>
          <span className='material-symbols-rounded' style={{ color: `var(--accent-primary)` }}>
            image
          </span>
        </div>
      )}

      {isVideo ? (
        <video
          src={attachment.url}
          controls
          className='chat-video'
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <track kind='captions' />
        </video>
      ) : (
        <button
          type='button'
          className={loaded ? '' : 'hidden-img'}
          onClick={() => {
            openModal('IMAGE_PREVIEW', {
              src: attachment.url,
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
            src={attachment.url}
            alt={attachment.filename}
            className={`chat-image ${!loaded ? 'loading' : ''}`}
            onLoad={() => {
              setLoaded(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </button>
      )}
    </div>
  );
};
