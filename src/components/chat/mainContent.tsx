/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import './mainContent.css';

import { type JSX, useCallback, useEffect, useRef, useState } from 'react';

import { useUserStore } from '@/stores/userstore';
import type { Channel } from '@/types/channel';
import type { MessageCreate, MessageDelete, MessageUpdate } from '@/types/gateway';
import type { Guild, Member } from '@/types/guilds';
import { type Message, MessageListSchema, MessageSchema } from '@/types/messages';
import type { User } from '@/types/users';
import { get, post } from '@/utils/api';
import { useUserProfileActions } from '@/utils/profileUtils';

import { useAssetsUrl } from '../../context/assetsUrl';
import { useGateway } from '../../context/gatewayContext';
import { useModal } from '../../context/modalContext';
import { getDefaultAvatar } from '../../utils/avatar';
import ChatInput from './chatInput';
import renderDfm from './dfm/dfmRenderer';
import MemberList from './memberList';

interface MediaAttachment {
  file: File;
  preview: string;
  id: string;
}

interface MainContentProps {
  selectedChannel: Channel;
  selectedGuild: Guild | null;
  unreads?: any;
  mentions?: any;
  onChannelSeen?: (guild_id: string | null, channel_id: string, lastMsgId: string) => Promise<void>;
}

export const MESSAGE_STATE = Object.freeze({
  PENDING: 0,
  SENT: 1,
  FAILED: -1,

  0: 'Pending',
  1: 'Sent',
  '-1': 'Failed',
}); //Should I put this somewhere else?

type LocalMessage = Message & { state: number };

const MainContent = ({
  selectedChannel,
  selectedGuild,
  unreads,
  mentions,
  onChannelSeen,
}: MainContentProps): JSX.Element => {
  const { openModal } = useModal();
  const { openUserProfile, openFullProfile } = useUserProfileActions(selectedGuild);
  const [suggestionTrigger, setSuggestionTrigger] = useState<{
    type: 'user' | 'role' | 'channel';
    query: string;
    startIndex: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const getUser = useUserStore((state) => state.getUser);
  const { typingUsers, user, getMember, getMemberColor, getPresence, memberLists } = useGateway();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const lastTypingSent = useRef<number>(0);
  const isloadingMore = useRef(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const autoScroll = useRef(true);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    const channelId = selectedChannel.id;
    const lastMsgId = selectedChannel.last_message_id ?? null;
    const key = selectedGuild?.id ?? 'direct_messages';
    const isUnread = unreads?.get(key)?.has(channelId);
    const hasMentions = mentions?.get(key)?.has(channelId);

    if (isUnread || hasMentions) {
      void onChannelSeen!(selectedGuild?.id || null, channelId, lastMsgId!);
    }
  }, [selectedChannel.id, selectedChannel.last_message_id, selectedGuild?.id, onChannelSeen]);

  const addFiles = (files: File[]) => {
    const newAttachments: MediaAttachment[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: crypto.randomUUID(),
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      addFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    addFiles(files);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      const removed = prev.find((a) => a.id === id);

      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }

      return filtered;
    });
  };

  const scrollToBottom = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (autoScroll.current) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredSuggestions]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);

        addFiles(files);
        e.preventDefault();
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const fetchMessages = useCallback(
    async (limit: number, before?: string) => {
      const url = `/channels/${selectedChannel.id}/messages?limit=${String(limit)}${before ? `&before=${before}` : ''}`;

      try {
        const response = await get(url);
        const data: unknown = response;

        return MessageListSchema.parse(data);
      } catch (error) {
        console.error('Failed to fetch messages: ', error);
        return [];
      }
    },
    [selectedChannel.id],
  );

  const resolveMentions = (text: string): string => {
    if (!selectedGuild) return text;

    let resolvedText = text;

    const channels = selectedGuild.channels || [];

    channels.forEach((ch: Channel) => {
      const escapedName = ch.name!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`#${escapedName}\\b`, 'g');

      resolvedText = resolvedText.replace(regex, `<#${ch.id}>`);
    });

    const roles = selectedGuild.roles || [];

    roles.forEach((role) => {
      const escapedName = role.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}\\b`, 'g');

      resolvedText = resolvedText.replace(regex, `<@&${role.id}>`);
    }); //yeah uh role mentions dont really work with spaces

    const memberState = memberLists![selectedGuild.id];
    const listItems = Array.isArray(memberState) ? memberState : memberState?.items || [];
    const members: Member[] = listItems
      .filter((item: any) => !!item.member)
      .map((item: any) => item.member);

    members.forEach((m) => {
      const names = [m.user.username, m.nick, m.user.global_name].filter(Boolean);

      names.forEach((name) => {
        const escapedName = name!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`@${escapedName}\\b`, 'g');

        resolvedText = resolvedText.replace(regex, `<@${m.user.id}>`);
      });
    });

    resolvedText = resolvedText.replace(/#\d{1,4}\b/g, '');

    return resolvedText;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatMessage.trim() && attachments.length === 0) return;

    const formData = new FormData();

    const nonce = Math.floor(Math.random() * 1000000000).toString();

    const ghostMessage: Message = {
      id: `temp-${nonce}`,
      nonce: nonce,
      channel_id: selectedChannel.id,
      content: chatMessage,
      author: user!,
      timestamp: new Date().toISOString(),
      attachments: attachments.map((at) => ({
        id: at.id,
        filename: at.file.name,
        url: at.preview,
        size: at.file.size,
        proxy_url: at.preview,
      })),
      embeds: [],
      mentions: [],
      pinned: false,
      tts: false,
      type: 0,
      state: MESSAGE_STATE.PENDING, //0 = sending (1 = sent, -1 = failed)
    } as LocalMessage;

    const payload = {
      content: resolveMentions(chatMessage),
      nonce: nonce,
      tts: false,
      embeds: [],
    };

    formData.append('payload_json', JSON.stringify(payload));

    attachments.forEach((at, index) => {
      formData.append(`files[${index.toString()}]`, at.file);
    });

    setMessages((prev) => [...prev, ghostMessage]);
    setChatMessage('');

    const toCleanup = [...attachments];

    setAttachments([]);

    try {
      const response = await post(`/channels/${selectedChannel.id}/messages`, formData);

      toCleanup.forEach((at) => {
        URL.revokeObjectURL(at.preview);
      });

      if (onChannelSeen && response?.id) {
        void onChannelSeen(selectedGuild?.id ?? null, selectedChannel.id, response.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      setMessages((prev) =>
        prev.map((m) => (m.nonce === nonce ? { ...m, state: MESSAGE_STATE.FAILED } : m)),
      );
    }

    lastTypingSent.current = 0;
  };

  const handleScroll = async () => {
    const scroller = scrollerRef.current;

    if (!scroller || messages.length === 0 || isloadingMore.current) return;

    if (scroller.scrollTop === 0) {
      isloadingMore.current = true;

      const oldestMsgId = messages[0]?.id;
      const prevHeight = scroller.scrollHeight;

      const olderMessages = await fetchMessages(50, oldestMsgId);

      if (olderMessages.length > 0) {
        const reversedOlder = olderMessages.reverse();

        setMessages((prev) => [...reversedOlder, ...prev]);

        requestAnimationFrame(() => {
          if (scrollerRef.current) {
            const newHeight = scrollerRef.current.scrollHeight;
            const heightDifference = newHeight - prevHeight;

            scrollerRef.current.scrollTop = heightDifference;

            setTimeout(() => {
              isloadingMore.current = false;
            }, 150);
          }
        });
      } else {
        isloadingMore.current = false;
      }
    }
    autoScroll.current = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight;
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msgDate.getTime() === today.getTime()) {
      return `Today at ${timeStr}`;
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${date.toLocaleDateString()} ${timeStr}`;
    }
  };

  useEffect(() => {
    if (!selectedChannel.id) {
      setMessages([]);
      return;
    }

    isloadingMore.current = true;
    setFirstLoad(true);
    setMessages([]);

    void fetchMessages(50).then((data) => {
      if (data.length > 0) {
        setMessages([...data].reverse());
        autoScroll.current = true;
      }
      isloadingMore.current = false;
      setFirstLoad(false);
    });
  }, [selectedChannel.id, fetchMessages]);

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<MessageCreate>) => {
      const newMessage = event.detail as LocalMessage;

      if (newMessage.channel_id !== selectedChannel.id) return;

      setMessages((prev) => {
        const matchIdx = prev.findIndex(
          (m) =>
            (newMessage.nonce && String(m.nonce) === String(newMessage.nonce)) ||
            m.id === newMessage.id,
        );

        if (matchIdx !== -1) {
          const copy = [...prev];
          copy[matchIdx] = { ...newMessage, state: MESSAGE_STATE.SENT };
          return copy;
        }

        return [...prev, { ...newMessage, state: MESSAGE_STATE.SENT }];
      });

      scrollToBottom();
    };
    //MessageCreate, MessageUpdate and MessageDelete need types
    const handleUpdateMessage = (event: CustomEvent<MessageUpdate>) => {
      const updatedMessage = event.detail as LocalMessage;

      if (updatedMessage.channel_id !== selectedChannel.id) return;

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === updatedMessage.id);

        if (exists) {
          return prev.map((old) =>
            old.id === updatedMessage.id ? { ...old, ...updatedMessage } : old,
          );
        }

        return [...prev, MessageSchema.parse(updatedMessage)];
      });
    };

    const handleDeleteMessage = (event: CustomEvent<MessageDelete>) => {
      const deletedMessage = event.detail;

      if (deletedMessage.channel_id === selectedChannel.id) {
        setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessage.id));
      }
    };

    window.addEventListener('gateway_message_create', handleNewMessage);
    window.addEventListener('gateway_message_update', handleUpdateMessage);
    window.addEventListener('gateway_message_delete', handleDeleteMessage);

    return () => {
      window.removeEventListener('gateway_message_create', handleNewMessage);
      window.removeEventListener('gateway_message_update', handleUpdateMessage);
      window.removeEventListener('gateway_message_delete', handleDeleteMessage);
    };
  }, [selectedChannel.id]);

  const ReplyPreview = ({ referencedMessage }: { referencedMessage: Message }) => {
    const { url: defaultAvatarUrl } = useAssetsUrl(
      `/assets/${getDefaultAvatar(referencedMessage.author) ?? ''}.png`,
    );

    const avatarUrl = referencedMessage.author.avatar
      ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${referencedMessage.author.id}/${referencedMessage.author.avatar}.png`
      : defaultAvatarUrl;

    return (
      <div className='message-reply-preview'>
        <div className='reply-spine'></div>
        <img src={avatarUrl} className='reply-avatar avatar-img' alt='' />
        <span className='reply-author'>
          {referencedMessage.author.global_name ?? referencedMessage.author.username}
        </span>
        <div className='reply-content'>
          {renderDfm(referencedMessage.content, selectedGuild?.id)}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const allMessages = messages;

    if (allMessages.length === 0) {
      if (firstLoad)
        return (
          <div className='no-messages'>
            <h1>Loading...</h1>
          </div>
        );
      else
        return (
          <div className='no-messages'>
            <h1>There are no messages here yet!</h1>
            <p>This is the start of something exciting!</p>
          </div>
        );
    }

    const AuthorAvatar = ({ msg, member }: { msg: Message; member?: Member }) => {
      const { url: defaultAvatarUrl, rollover } = useAssetsUrl(
        `/assets/${getDefaultAvatar(msg.author) ?? ''}.png`,
      );
      const avatarUrl = msg.author.avatar
        ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${msg.author.id ?? ''}/${msg.author.avatar}.png`
        : defaultAvatarUrl;

      const presence = getPresence(msg.author.id);
      const status = presence?.status ?? 'offline';

      const memberObj: Member = member ?? {
        id: msg.author.id!,
        user: msg.author as User,
        presence: {
          user: msg.author as User,
          status: status,
          activities: presence?.activities ?? [],
        },
        joined_at: new Date().toISOString(),
        roles: [],
      };

      return (
        <img
          src={avatarUrl}
          className='avatar-img'
          alt=''
          style={{ cursor: 'pointer' }}
          onError={() => {
            rollover();
          }}
          onClick={(e) => {
            openUserProfile(e, memberObj);
          }}
        />
      );
    };

    return allMessages.map((msg: LocalMessage, index: number) => {
      const messageKey = msg.nonce || msg.id;
      const prevMsg = allMessages[index - 1];

      const isNewGroup =
        msg.referenced_message ||
        prevMsg?.author.id !== msg.author.id ||
        new Date(msg.timestamp).getTime() - new Date(prevMsg?.timestamp ?? '').getTime() > 420000;

      const pendingClass = msg.state == MESSAGE_STATE.PENDING ? 'message-pending' : '';
      const pendingStyle =
        msg.state == MESSAGE_STATE.PENDING ? { opacity: 0.5, filter: 'grayscale(100%)' } : {};

      const msgContent = (
        <>
          <div
            className={`message-content ${msg.state === MESSAGE_STATE.FAILED ? 'message-failed' : ''}`}
          >
            {renderDfm(msg.content, selectedGuild?.id)}
            {msg.attachments.length > 0 && (
              <div className='message-attachments'>
                {msg.attachments.map((attachment: NonNullable<Message['attachments']>[number]) => {
                  const isVideo = /\.(mp4|webm|mov)$/i.exec(attachment.filename);

                  return (
                    <div key={attachment.id} className='attachment-item'>
                      {isVideo ? (
                        <video
                          src={attachment.url}
                          controls
                          className='chat-video'
                          style={{ width: '50%' }}
                        >
                          <track kind='captions' />
                        </video>
                      ) : (
                        <button
                          type='button'
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
                            display: 'block',
                            width: '50%',
                          }}
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className='chat-image'
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: 400,
                            }}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      );

      if (isNewGroup) {
        const userPresence = getPresence(msg.author.id);
        const currentStatus = userPresence?.status || 'offline';

        const member = (selectedGuild ? getMember(selectedGuild.id, msg.author.id) : null) ?? {
          id: msg.author.id!,
          user: msg.author as User,
          presence: {
            user: msg.author as User,
            status: currentStatus,
            activities: userPresence?.activities || [],
          },
          joined_at: new Date().toISOString(),
          roles: [],
        };

        const color = getMemberColor(member, selectedGuild);

        return (
          <>
            {msg.referenced_message && (
              <ReplyPreview referencedMessage={msg.referenced_message as Message} />
            )}
            <div key={messageKey} className={`message-group ${pendingClass}`} style={pendingStyle}>
              <AuthorAvatar msg={msg} member={member} />
              <div className='message-details'>
                <div className='message-header'>
                  <span
                    className='author-name'
                    style={{ color: color, cursor: 'pointer' }}
                    onClick={(e) => {
                      void openUserProfile(e, member);
                    }}
                  >
                    {member.nick ?? msg.author.global_name ?? msg.author.username}
                  </span>
                  <span className='timestamp'>{formatTimestamp(msg.timestamp)}</span>
                </div>
                {msgContent}
              </div>
            </div>
          </>
        );
      }

      return (
        <div
          key={messageKey}
          className={`message-details message-sub ${pendingClass}`}
          style={pendingStyle}
        >
          {msgContent}
        </div>
      );
    });
  };

  const filterSuggestions = (type: 'user' | 'role' | 'channel', query: string) => {
    const q = query.toLowerCase();

    if (type === 'user') {
      const memberState = selectedGuild ? memberLists![selectedGuild.id] : null;
      const listItems = Array.isArray(memberState) ? memberState : memberState?.items || [];

      const guildMembers: Member[] = listItems
        .filter((item: any) => !!item.member)
        .map((item: any) => item.member);

      const guildRoles = selectedGuild?.roles || [];
      const recentSpeakerIds = Array.from(new Set(messages.map((m) => m.author.id))).reverse();

      const filteredUsers = guildMembers
        .filter(
          (m: Member) =>
            m.user.username.toLowerCase().includes(q) ||
            m.nick?.toLowerCase().includes(q) ||
            m.user.global_name?.toLowerCase().includes(q),
        )
        .map((m) => ({ ...m, suggestionType: 'user' }));

      const filteredRoles = guildRoles
        .filter((role: any) => role.name.toLowerCase().includes(q) && role.name !== '@everyone')
        .map((r) => ({ ...r, suggestionType: 'role' }));

      const combined = [...filteredUsers, ...filteredRoles]
        .sort((a: any, b: any) => {
          const getName = (item: any) => {
            if (item.suggestionType === 'user') {
              return (item.nick || item.user.global_name || item.user.username).toLowerCase();
            }

            return item.name.toLowerCase();
          };

          const nameA = getName(a);
          const nameB = getName(b);

          const startsA = nameA.startsWith(q);
          const startsB = nameB.startsWith(q);

          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;

          if (a.suggestionType === 'user' && b.suggestionType === 'user') {
            const indexA = recentSpeakerIds.indexOf(a.user.id);
            const indexB = recentSpeakerIds.indexOf(b.user.id);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
          }

          return nameA.localeCompare(nameB);
        })
        .slice(0, 8);

      setFilteredSuggestions(combined);
    } else {
      if (!selectedGuild?.channels) {
        setFilteredSuggestions([]);
        return;
      }

      const filteredChannels = selectedGuild.channels
        .filter((c: any) => c.name.toLowerCase().includes(q) && c.type !== 4)
        .map((c) => ({ ...c, suggestionType: 'channel' }))
        .sort((a: Channel, b: Channel) => {
          const startsA = a.name!.toLowerCase().startsWith(q);
          const startsB = b.name!.toLowerCase().startsWith(q);
          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;
          return a.name!.localeCompare(b.name!);
        })
        .slice(0, 8);

      setFilteredSuggestions(filteredChannels);
    }
  };

  const updateChat = (message: string) => {
    setChatMessage(message);

    const mentionMatch = /(@|<@!?|#)([\w\s]*)$/.exec(message);

    if (mentionMatch) {
      const symbol = mentionMatch[1]!;
      const query = mentionMatch[2]!;
      const type = symbol.includes('#') ? 'channel' : 'user'; //or role but you know.. we do that logic later

      setSuggestionTrigger({ type, query, startIndex: mentionMatch.index });
      filterSuggestions(type, query);
    } else {
      setSuggestionTrigger(null);
      setFilteredSuggestions([]);
    }

    const now = Date.now();

    if (now - lastTypingSent.current > 3000 && message.length > 0) {
      lastTypingSent.current = now;
      void sendTypingStart();
    }
  };

  const sendTypingStart = async () => {
    try {
      await post(`/channels/${selectedChannel.id}/typing`, {});
    } catch (e) {
      console.error('Failed to send typing status', e);
    }
  };

  const TypingName = ({ userId }: { userId: string }) => {
    const [name, setName] = useState('Someone');

    useEffect(() => {
      const getName = async () => {
        const member = getMember(selectedGuild?.id, userId);

        if (member?.nick || member?.user.username) {
          setName(member.nick || member.user.username);
          return;
        }

        const user = await getUser(userId);

        if (user?.username) {
          setName(user.username);
        }
      };

      void getName();
    }, [userId]);

    return <strong>{name}</strong>;
  };

  const handleTypingStatus = () => {
    if (!selectedChannel.id) return null;

    const channelTypingMap = typingUsers[selectedChannel.id] ?? {};
    let typingIds: string[] = Object.keys(channelTypingMap);
    if (user != null) typingIds = typingIds.filter((id) => id !== user.id);

    if (typingIds.length === 0) return null;

    const typingId0 = typingIds[0];
    if (!typingId0) {
      return null;
    }

    const typingId1 = typingIds[1];
    if (!typingId1) {
      return (
        <p>
          <TypingName userId={typingId0} /> is typing...
        </p>
      );
    }

    const typingId2 = typingIds[2];
    if (!typingId2) {
      return (
        <p>
          <TypingName userId={typingId0} /> and <TypingName userId={typingId1} /> are typing...
        </p>
      );
    }

    const typingId3 = typingIds[3];
    if (!typingId3) {
      return (
        <p>
          <TypingName userId={typingId0} />, <TypingName userId={typingId1} /> and{' '}
          <TypingName userId={typingId2} /> are typing...
        </p>
      );
    }

    return <p>Several people are typing...</p>;
  };

  const applySuggestion = (item: any) => {
    if (!suggestionTrigger) return;

    const before = chatMessage.substring(0, suggestionTrigger.startIndex);
    const queryLength = suggestionTrigger.query.length + 1;
    const after = chatMessage.substring(suggestionTrigger.startIndex + queryLength);

    let insertion = '';

    if (item.suggestionType === 'user') {
      insertion = `@${item.user.username}#${item.user.discriminator} `;
    } else if (item.suggestionType === 'role') {
      insertion = `@${item.name} `;
    } else {
      insertion = `#${item.name} `;
    }

    setChatMessage(before + insertion + after);
    setSuggestionTrigger(null);
    setFilteredSuggestions([]);
  };

  return (
    <main
      className='chat-main'
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <header className='header'>
        <div className='header-left'>
          <div className='header-icon'>
            <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
              {selectedGuild ? 'tag' : 'alternate_email'}
            </span>
          </div>
          <span
            className='header-title'
            onClick={(e: React.MouseEvent) => {
              if (selectedChannel?.type === 1 && selectedChannel.recipients) {
                const recipient = selectedChannel.recipients[0];
                const presence = getPresence(recipient!.id);
                const status = presence?.status ?? 'offline';

                const memberObj: Member = {
                  id: recipient?.id!,
                  user: recipient as User,
                  presence: {
                    user: recipient as User,
                    status: status,
                    activities: [],
                  },
                  joined_at: new Date().toISOString(),
                  roles: [],
                };

                void openFullProfile(e, memberObj);
              }
            }}
            style={
              selectedChannel.type === 1
                ? {
                    cursor: 'pointer',
                  }
                : {}
            }
          >
            {selectedChannel.name || selectedChannel?.recipients?.[0]?.username || 'Direct Message'}
          </span>
          {selectedChannel.topic && (
            <span className='header-topic'> | {selectedChannel.topic}</span>
          )}
        </div>
        <div className='header-right'>
          <div className='header-right-left'>
            <button className='icon-btn'>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                forum
              </span>
            </button>
            <button className='icon-btn'>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                notifications
              </span>
            </button>
            <button className='icon-btn'>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                push_pin
              </span>
            </button>
            <button className='icon-btn'>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                group
              </span>
            </button>
            <div className='search-bar'>
              <input type='text' placeholder='Search' />
              <span className='material-symbols-rounded search-icon'>search</span>
            </div>
          </div>
          <div className='vertical-divider'></div>
          <button className='icon-btn'>
            <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
              inbox
            </span>
          </button>
        </div>
      </header>

      {isDragging && (
        <div className='drag-overlay'>
          <div className='drag-content'>
            <span className='material-symbols-rounded'>attach_file_add</span>
            <p>Drop files to upload</p>
          </div>
        </div>
      )}

      <div className='chat-content-row'>
        <div className='chat-view'>
          <div
            className='messages-scroller scroller'
            ref={scrollerRef}
            onScroll={() => {
              void handleScroll();
            }}
          >
            {renderMessages()}
          </div>
          <form
            className='chat-input-area'
            onSubmit={(e) => {
              void handleSendMessage(e);
            }}
          >
            {suggestionTrigger != null && filteredSuggestions.length > 0 && (
              <>
                <div className='input-wrapper' key={'SuggestionsBar'}>
                  <div className='input-row'>
                    {suggestionTrigger != null && filteredSuggestions.length > 0 && (
                      <>
                        <div className='chat-suggestions-wrapper'>
                          {filteredSuggestions.map((item, index) => {
                            const isUser = item.suggestionType === 'user';
                            const isRole = item.suggestionType === 'role';

                            const prefix = isUser || isRole ? '@' : '#';
                            let name = '';
                            let subtext = '';

                            if (isUser) {
                              name = item.nick || item.user.username;
                              subtext =
                                item.user.discriminator !== '0'
                                  ? `${item.user.username}#${item.user.discriminator}`
                                  : item.user.username;
                            } else if (isRole) {
                              name = item.name;
                              subtext = 'Role';
                            } else {
                              const topic = item.topic || 'Channel';
                              const maxTopicLength = 50;

                              name = item.name;
                              subtext =
                                topic.length > maxTopicLength
                                  ? `${topic.substring(0, maxTopicLength)}...`
                                  : topic;
                            }

                            return (
                              <div
                                key={item.id}
                                className={`chat-suggestion ${index === selectedIndex ? 'active' : ''}`}
                                style={{ '--prefix': `"${prefix}"` } as React.CSSProperties}
                                onClick={() => {
                                  applySuggestion(item);
                                }}
                                onMouseEnter={() => {
                                  setSelectedIndex(index);
                                }}
                              >
                                {isUser && item.user.avatar ? (
                                  <img
                                    src={`${localStorage.getItem('selectedCdnUrl')}/avatars/${item.user.id}/${item.user.avatar}.png`}
                                    className='avatar-img suggested-item-avi'
                                  />
                                ) : (
                                  <div className='suggested-item-avi' />
                                )}
                                <div className='chat-suggestion-item'>
                                  <span>{name}</span>
                                  <span>{subtext}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
            <div className='input-wrapper'>
              {attachments.length > 0 && (
                <div className='attachment-shelf'>
                  {attachments.map((at) => {
                    const isVideo = at.file.type.startsWith('video/');

                    return (
                      <div key={at.id} className='attachment-container'>
                        {isVideo ? (
                          <video src={at.preview} className='attachment-preview' muted />
                        ) : (
                          <img
                            src={at.preview}
                            className='attachment-preview'
                            alt='Attachment preview'
                          />
                        )}
                        <button
                          type='button'
                          className='attachment-remove'
                          onClick={() => {
                            removeAttachment(at.id);
                          }}
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className='input-row'>
                <button
                  type='button'
                  className='add-media-btn'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className='add-icon-circle'>
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                      add_circle
                    </span>
                  </div>
                </button>
                <ChatInput
                  placeholder={
                    selectedChannel.name
                      ? `Message #${selectedChannel.name}`
                      : selectedChannel.recipients?.[0]
                        ? `Message @${selectedChannel.recipients[0].global_name ?? selectedChannel.recipients[0].username ?? 'someone'}`
                        : 'Message...'
                  }
                  value={chatMessage}
                  onChange={(e) => {
                    updateChat(e.target.value);
                  }}
                  onSubmit={(e) => {
                    void handleSendMessage(e);
                  }}
                />
                <div className='input-icons'>
                  <button type='button' className='input-icon-btn'>
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                      gif_box
                    </span>
                  </button>
                  <button type='button' className='input-icon-btn'>
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                      sticky_note_2
                    </span>
                  </button>
                  <button type='button' className='input-icon-btn'>
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                      mood
                    </span>
                  </button>
                  <button type='button' className='input-icon-btn'>
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                      interests
                    </span>
                  </button>
                </div>

                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  multiple
                />
              </div>
            </div>
          </form>
          <div className='typing-status-wrapper'>{handleTypingStatus()}</div>
        </div>

        {selectedGuild && (
          <MemberList
            key={selectedChannel.id}
            selectedGuild={selectedGuild}
            selectedChannel={selectedChannel}
          />
        )}
      </div>
    </main>
  );
};

export default MainContent;
