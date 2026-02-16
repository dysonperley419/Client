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
}

const MainContent = ({ selectedChannel, selectedGuild }: MainContentProps): JSX.Element => {
  const { openModal } = useModal();
  const { openUserProfile, openFullProfile } = useUserProfileActions(selectedGuild);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const getUser = useUserStore((state) => state.getUser);
  const { typingUsers, user, getMember, getMemberColor, getPresence } = useGateway();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const lastTypingSent = useRef<number>(0);
  const isloadingMore = useRef(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const autoScroll = useRef(true);

  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newAttachments: MediaAttachment[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7),
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatMessage.trim() && attachments.length === 0) return;

    const formData = new FormData();

    const payload = {
      content: chatMessage,
      nonce: Math.floor(Math.random() * 1000000000).toString(),
      tts: false,
      embeds: [],
    };

    formData.append('payload_json', JSON.stringify(payload));

    attachments.forEach((at, index) => {
      formData.append(`files[${index.toString()}]`, at.file);
    });

    setChatMessage('');

    const toCleanup = [...attachments];

    setAttachments([]);

    try {
      await post(`/channels/${selectedChannel.id}/messages`, formData);

      toCleanup.forEach((at) => {
        URL.revokeObjectURL(at.preview);
      });
    } catch (error) {
      console.error('Error sending message:', error);
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
      const newMessage = event.detail;

      if (newMessage.channel_id === selectedChannel.id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMessage.id)) return prev;
          return [...prev, MessageSchema.parse(newMessage)];
        });

        scrollToBottom();
      }
    };
    //MessageCreate, MessageUpdate and MessageDelete need types
    const handleUpdateMessage = (event: CustomEvent<MessageUpdate>) => {
      const updatedMessage = event.detail;

      if (updatedMessage.channel_id === selectedChannel.id) {
        setMessages((prev) =>
          prev.map((old) =>
            old.id === updatedMessage.id ? MessageSchema.parse(updatedMessage) : old,
          ),
        );
      }
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

  const renderMessages = () => {
    if (messages.length === 0) {
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

    return messages.map((msg: Message, index: number) => {
      const prevMsg = messages[index - 1];
      const isNewGroup =
        prevMsg?.author.id !== msg.author.id ||
        new Date(msg.timestamp).getTime() - new Date(prevMsg?.timestamp ?? '').getTime() > 420000;

      const msgContent = (
        <>
          <div className='message-content'>
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
          <div key={msg.id} className='message-group'>
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
        );
      }

      return (
        <div key={msg.id} className='message-details message-sub'>
          {msgContent}
        </div>
      );
    });
  };

  const updateChat = (message: string) => {
    setChatMessage(message);

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

  return (
    <main className='chat-main'>
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
            <div className='input-wrapper'>
              {attachments.length > 0 && (
                <div className='attachment-shelf'>
                  {attachments.map((at) => (
                    <div key={at.id} className='attachment-container'>
                      <img
                        src={at.preview}
                        className='attachment-preview'
                        alt='Attachment preview'
                      />
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
                  ))}
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
