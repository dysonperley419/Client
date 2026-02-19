import './guildSidebar.css';

import { type JSX } from 'react';
import { Link } from 'react-router-dom';

import imgFlickerLogo from '@/assets/flickerLogo.png';
import type { Guild } from '@/types/guilds';

import { useAssetsUrl } from '../../context/assetsUrl';
import { useContextMenu } from '../../context/contextMenuContext';
import { useGateway } from '../../context/gatewayContext';
import { useModal } from '../../context/modalContext';
import { usePopup } from '../../context/popupContext';
import { getDefaultAvatar } from '../../utils/avatar';

const GuildSidebar = ({
  guilds,
  unreads,
  mentions,
  selectedGuildId,
  onSelectGuild,
  markAsRead,
}: {
  guilds: Guild[];
  unreads: any;
  mentions: any;
  selectedGuildId?: string | null;
  onSelectGuild: (guild: Guild) => void;
  markAsRead: (guild_id: string) => Promise<void>;
}): JSX.Element => {
  const { user, sessions, relationships, getPresence } = useGateway();
  const { openModal } = useModal();
  const { openContextMenu } = useContextMenu();
  const { openPopup, popupType } = usePopup();

  const handleLeaveServer = (guild_name: string, guild_id: string) => {
    openModal('CONFIRMATION_LEAVE', { name: guild_name, id: guild_id, type: 'server' });
  };

  const handleDeleteServer = (guild_name: string, guild_id: string) => {
    openModal('CONFIRMATION_DELETE', { name: guild_name, id: guild_id, type: 'server' });
  };

  const handleRightClick = (e: React.MouseEvent, guild: Guild) => {
    e.preventDefault();

    const isOwner = guild.owner_id === user?.id;

    openContextMenu(
      e.clientX,
      e.clientY,
      <div className='context-menu-out guild-context-menu'>
        <div className='button' onClick={() => markAsRead(guild.id)}>
          Mark as read
        </div>
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
    sessions[0]?.status ?? (user?.id ? getPresence(user.id)?.status : undefined) ?? 'offline';

  const onlineFriendsCount = relationships.filter((r) => {
    const friendStatus = getPresence(r.id)?.status ?? 'offline';

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
        {guilds.map((guild: Guild) => {
          const guildMentionsMap = mentions.get(guild.id);
          let totalMentions = 0;

          if (guildMentionsMap) {
            guildMentionsMap.forEach((count: number) => {
              totalMentions += count;
            });
          }

          const hasUnreads = unreads.has(guild.id) && unreads.get(guild.id).size > 0;

          return (
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
                style={{ '--mention-count': `"${totalMentions}"` } as React.CSSProperties}
                className={`icon-container shadow-container ${selectedGuildId === guild.id && !isUserPopupOpen ? 'active' : ''} ${hasUnreads ? 'unread-notification' : ''} ${totalMentions > 0 ? 'mention-badge' : ''}`}
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
          );
        })}

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
