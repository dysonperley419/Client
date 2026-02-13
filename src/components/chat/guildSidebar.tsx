import './guildSidebar.css';

import { type JSX, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import imgFlickerLogo from '@/assets/flickerLogo.png';
import { useUserStore } from '@/stores/userstore';
import type { Guild } from '@/types/guilds';
import type { User } from '@/types/users';

import { useAssetsUrl } from '../../context/assetsUrl';
import { useContextMenu } from '../../context/contextMenuContext';
import { useGateway } from '../../context/gatewayContext';
import { useModal } from '../../context/modalContext';
import { usePopup } from '../../context/popupContext';
import { getDefaultAvatar } from '../../utils/avatar';

const GuildSidebar = ({
  guilds,
  selectedGuildId,
  onSelectGuild,
}: {
  guilds: Guild[];
  selectedGuildId?: string | null;
  onSelectGuild: (guild: Guild) => void;
}): JSX.Element => {
  const storedUsers = useUserStore((state) => state.users);
  const [unreads, setUnreads] = useState<Set<string>>(new Set());
  const [mentions, setMentions] = useState<Map<string, number>>(new Map());
  const { user, sessions, presences, relationships } = useGateway();
  const { openModal } = useModal();
  const { openContextMenu } = useContextMenu();
  const { openPopup, popupType } = usePopup();

  const handleLeaveServer = (guild_name: string, guild_id: string) => {
    openModal('CONFIRMATION_LEAVE', { name: guild_name, id: guild_id, type: 'server' });
  };

  const handleDeleteServer = (guild_name: string, guild_id: string) => {
    openModal('CONFIRMATION_DELETE', { name: guild_name, id: guild_id, type: 'server' });
  };

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (!newMessage.guild_id || newMessage.guild_id === selectedGuildId) return;

      const isMentioned =
        newMessage.mentions?.some((m: User) => m.id === user?.id) || newMessage.mention_everyone;

      if (isMentioned) {
        setMentions((prev) => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(newMessage.guild_id) ?? 0;
          newMap.set(newMessage.guild_id, currentCount + 1);
          return newMap;
        });
      } else {
        setUnreads((prev) => new Set(prev).add(newMessage.guild_id));
      }
    };

    window.addEventListener('gateway_message_create', handleNewMessage);

    return () => {
      window.removeEventListener('gateway_message_create', handleNewMessage);
    };
  }, [selectedGuildId]);

  useEffect(() => {
    if (selectedGuildId) {
      setUnreads((prev) => {
        const next = new Set(prev);
        next.delete(selectedGuildId);
        return next;
      });
      setMentions((prev) => {
        if (!prev.has(selectedGuildId)) return prev;
        const next = new Map(prev);
        next.delete(selectedGuildId);
        return next;
      });
    }
  }, [selectedGuildId]);

  const handleRightClick = (e: React.MouseEvent, guild: Guild) => {
    e.preventDefault();

    const isOwner = guild.owner_id === user?.id;

    openContextMenu(
      e.clientX,
      e.clientY,
      <div className='context-menu-out guild-context-menu'>
        <div className='button'>Change nickname</div>
        {!isOwner && (
          <>
            <hr />
            <div
              role='button'
              tabIndex={0}
              className='button'
              style={{ color: 'var(--bg-dnd)' }}
              onClick={() => {
                handleLeaveServer(guild.name, guild.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleLeaveServer(guild.name, guild.id);
                }
              }}
            >
              Leave Server
            </div>
          </>
        )}
        {isOwner && (
          <>
            <hr />
            <div className='button'>Server Settings</div>
            <div
              role='button'
              tabIndex={0}
              className='button'
              style={{ color: 'var(--bg-dnd)' }}
              onClick={() => {
                handleDeleteServer(guild.name, guild.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleDeleteServer(guild.name, guild.id);
                }
              }}
            >
              Delete Server
            </div>
          </>
        )}
      </div>,
    );
  };

  const UserAvatar = () => {
    const { url: defaultAvatarUrl, rollover } = useAssetsUrl(
      `/assets/${getDefaultAvatar(user) ?? ''}.png`,
    );
    const customAvatarUrl = user?.avatar
      ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${user.id}/${user.avatar}.png`
      : defaultAvatarUrl;

    return (
      <img
        src={customAvatarUrl || ''}
        alt='User Avatar'
        className='guild-icon'
        onError={() => {
          rollover();
        }}
      />
    );
  };

  const isUserPopupOpen = popupType === 'CURRENT_USER_PROFILE';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const isHomeSelected = !selectedGuildId;
  const status =
    sessions[0]?.status ?? (user?.id ? presences[user.id]?.status : undefined) ?? 'offline';

  const onlineFriendsCount = relationships.filter((r) => {
    const liveFriend = storedUsers[r.id];
    const friendStatus = liveFriend?.presence?.status ?? 'offline';

    return r.type === 1 && friendStatus !== 'offline' && friendStatus !== 'invisible';
  }).length;

  return (
    <div id='guilds-column'>
      <div className='home-section'>
        <button
          className={`guild-icon-wrapper home-wrapper ${isHomeSelected && !isUserPopupOpen ? 'selected' : ''}`}
        >
          {isHomeSelected && !isUserPopupOpen && (
            <div className='selected-indicator-bg'>
              <div className='selected-gradient' />
            </div>
          )}
          <Link to='/channels/@me' className='home-btn-link'>
            <div
              className={`icon-container shadow-container ${isHomeSelected && !isUserPopupOpen ? 'active' : ''}`}
            >
              <img className={`guild-icon home-icon-inner`} src={imgFlickerLogo} alt='Home' />
            </div>
          </Link>
        </button>
        <div className='online-stats'>
          <span className='stat-text'>{onlineFriendsCount} ONLINE</span>
          <div className='stat-line' />
        </div>
      </div>

      <div className='server-section'>
        {guilds.map((guild: Guild) => (
          <button
            className={`guild-icon-wrapper ${selectedGuildId === guild.id && !isUserPopupOpen ? 'selected' : ''}`}
            key={guild.id}
            onClick={() => {
              onSelectGuild(guild);
            }}
            onContextMenu={(e) => {
              handleRightClick(e, guild);
            }}
          >
            {selectedGuildId === guild.id && !isUserPopupOpen && (
              <div className='selected-indicator-bg'>
                <div className='selected-gradient' />
              </div>
            )}
            <div
              style={
                { '--mention-count': `"${mentions.get(guild.id) ?? 0}"` } as React.CSSProperties
              }
              className={`icon-container shadow-container ${selectedGuildId === guild.id && !isUserPopupOpen ? 'active' : ''} ${unreads.has(guild.id) ? 'unread-notification' : ''} ${mentions && mentions.has(guild.id) ? 'mention-badge' : ''}`}
            >
              {guild.icon ? (
                <img
                  className='guild-icon'
                  src={`${localStorage.getItem('selectedCdnUrl') ?? ''}/icons/${guild.id}/${guild.icon}.png`}
                  alt={guild.name}
                  onError={handleImgError}
                />
              ) : (
                <div className={`guild-icon no-icon`}>{guild.name.charAt(0)}</div>
              )}
            </div>
          </button>
        ))}

        <button
          className={`guild-icon-wrapper`}
          key={`add-guild`}
          onClick={() => {
            openModal('WHATS_IT_GONNA_BE');
          }}
        >
          <div className='icon-container'>
            <div className={`guild-icon no-icon add-icon`}>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                add
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className='user-section'>
        <button
          className={`guild-icon-wrapper ${isUserPopupOpen ? 'selected' : ''}`}
          onClick={(e) => {
            if (isUserPopupOpen) return;
            const rect = e.currentTarget.getBoundingClientRect();
            openPopup('CURRENT_USER_PROFILE', {
              x: 12,
              y: rect.bottom - 400,
            });
          }}
        >
          <div
            className={`icon-container user-icon-container shadow-container ${isUserPopupOpen ? 'active' : ''}`}
          >
            <UserAvatar />
            <div className='user-status-indicator'>
              <div className='status-indicator-wrapper'>
                <div className={`status-dot-large ${status}`}></div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GuildSidebar;
