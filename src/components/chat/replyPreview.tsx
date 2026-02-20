import { useAssetsUrl } from "@/context/assetsUrl";
import type { Message } from "@/types/messages";
import { getDefaultAvatar } from "@/utils/avatar";
import renderDfm from './dfm/dfmRenderer';

interface ReplyPreviewProps {
    referencedMessage: Message;
    selectedGuildId?: string | null;
    scrollToMessage: (messageId: string) => void;
}

 export const ReplyPreview = ({ referencedMessage, scrollToMessage, selectedGuildId }: ReplyPreviewProps) => {
    const { url: defaultAvatarUrl } = useAssetsUrl(
      `/assets/${getDefaultAvatar(referencedMessage.author) ?? ''}.png`,
    );

    const avatarUrl = referencedMessage.author.avatar
      ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${referencedMessage.author.id}/${referencedMessage.author.avatar}.png`
      : defaultAvatarUrl;

    return (
      <div className='message-reply-preview' onClick={() => scrollToMessage(referencedMessage.id)}>
        <div className='reply-spine'></div>
        <img src={avatarUrl} className='reply-avatar avatar-img' alt='' />
        <span className='reply-author'>
          {referencedMessage.author.global_name ?? referencedMessage.author.username}
        </span>
        <div className='reply-content'>
          {renderDfm(referencedMessage.content, selectedGuildId ?? undefined)}
        </div>
      </div>
    );
  };