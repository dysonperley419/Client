import './serverProfile.css';

import { type JSX, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGateway } from '@/context/gatewayContext';
import type { Guild, Member } from '@/types/guilds';
import type { User } from '@/types/users';
import { get } from '@/utils/api';
import { logger } from '@/utils/logger';

import { useAssetsUrl } from '../../context/assetsUrl';
import { useModal } from '../../context/modalContext';
import { getDefaultAvatar } from '../../utils/avatar';
import { MutualItem } from '../chat/mutualItem';

interface ServerProfileProps {
  member: Member;
  mutual_guilds?: Guild[] | [];
  mutual_friends?: User[] | [];
  connected_accounts?: any[] | [];
  premium_since?: string | null;
  premium_type?: number;
}

export const ServerProfileModal = ({
  member,
  mutual_guilds: sharedGuilds,
  mutual_friends: sharedFriends,
}: ServerProfileProps): JSX.Element => {
  const { openModal, closeModal, updateModal } = useModal();
  const { guilds } = useGateway();
  const navigate = useNavigate();

  const status = member.presence?.status ?? 'offline';
  const [activeTab, setActiveTab] = useState<'INFO' | 'GUILDS' | 'FRIENDS'>('INFO');

  const handleGuildClick = (guildId: string) => {
    closeModal();
    navigate(`/channels/${guildId}`);
  };

  const handleFriendClick = async (user: User) => {
    closeModal();

    openModal('SERVER_PROFILE', { member: { user } as any });

    try {
      const query = new URLSearchParams({
        with_mutual_guilds: 'true',
        with_mutual_friends: 'true',
      }).toString();

      const fullProfile = await get(`/users/${member.id ?? member.user.id}/profile?${query}`);

      updateModal<'SERVER_PROFILE'>({
        mutual_guilds: fullProfile.mutual_guilds,
        mutual_friends: fullProfile.mutual_friends,
        connected_accounts: fullProfile.connected_accounts,
        premium_since: fullProfile.premium_since,
        premium_type: fullProfile.premium_type,
      });
    } catch (error) {
      logger.error(`SERVER_PROFILE`, `Failed to fetch full user profile from API!`, error);
    }
  };

  const MemberAvatar = ({ member }: { member: Member }) => {
    const { url: defaultAvatarUrl, rollover } = useAssetsUrl(
      `/assets/${getDefaultAvatar(member.user) ?? ''}.png`,
    );
    const avatarUrl =
      member.avatar || member.user.avatar
        ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${member.id ?? member.user.id}/${member.user.avatar ?? ''}.png`
        : defaultAvatarUrl;

    return (
      <img
        src={avatarUrl || ''}
        alt='Avatar'
        className='modal-avatar-img'
        onError={() => {
          rollover();
        }}
      />
    );
  };

  const bannerUrl = member.user.banner
    ? `url('${localStorage.getItem('selectedCdnUrl') ?? ''}/banners/${member.user.id}/${member.user.banner ?? ''}.png')`
    : 'none';

  return (
    <div className='profile-modal-root'>
      <div className='profile-modal-header' style={{ backgroundImage: bannerUrl }}>
        <div className='profile-modal-avatar-wrapper'>
          <MemberAvatar member={member} />
          <div
            className={`status-dot-large ${status}`}
            style={{
              right: '5px',
            }}
          />
        </div>
      </div>

      <div className='profile-modal-body'>
        <div className='profile-modal-identity'>
          <div className='modal-user-info'>
            <span className='modal-username'>{member.user.username}</span>
            <span className='modal-discriminator'>#{member.user.discriminator}</span>
            {member.user.bot && (
              <span
                className='bot-tag'
                style={{
                  bottom: '3px',
                }}
              >
                Bot
              </span>
            )}
          </div>
          {member.user.pronouns && <span className='modal-pronouns'>{member.user.pronouns}</span>}
        </div>

        {sharedGuilds !== undefined && (
          <>
            <hr className='popout-separator' />
            <div className='popout-section'>
              <div className='tab-bar'>
                <div
                  className={`tab ${activeTab === 'INFO' ? 'selected' : ''}`}
                  onClick={() => {
                    setActiveTab('INFO');
                  }}
                >
                  User Info
                </div>
                {sharedGuilds !== undefined && (
                  <>
                    <div
                      className={`tab ${activeTab === 'GUILDS' ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveTab('GUILDS');
                      }}
                    >
                      Mutual Servers ({sharedGuilds.length})
                    </div>
                    <div
                      className={`tab ${activeTab === 'FRIENDS' ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveTab('FRIENDS');
                      }}
                    >
                      Mutual Friends ({sharedFriends?.length})
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {member.user.bio && activeTab === 'INFO' && (
          <>
            <hr className='popout-separator' />
            <div className='popout-section'>
              <span className='section-title'>ABOUT ME</span>
              <div className='about-me-container'>
                <p>{member.user.bio}</p>
              </div>
            </div>
          </>
        )}

        <hr className='popout-separator' />

        {activeTab === 'INFO' && (
          <>
            <div className='popout-section'>
              <span className='section-title'>Note</span>
              <textarea className='note-input modal-note' placeholder='Click to add a note' />
            </div>
          </>
        )}

        {activeTab === 'GUILDS' && (
          <>
            <div className='popout-section'>
              <div className='mutual-list'>
                {sharedGuilds?.length ? (
                  sharedGuilds.map((shared: any) => {
                    //to-do make a type of shared guild where its just id and nick
                    const fullGuild = guilds.find((g: any) => g.id === shared.id);
                    const guildName = fullGuild?.name || 'Unknown Server';
                    const guildIcon = fullGuild?.icon
                      ? `${localStorage.getItem('selectedCdnUrl')}/icons/${fullGuild.id}/${fullGuild.icon}.png`
                      : '';

                    return (
                      <MutualItem
                        key={shared.id}
                        title={guildName}
                        subtitle={shared.nick ? shared.nick : ''}
                        icon={guildIcon}
                        onClick={() => {
                          handleGuildClick(shared.id);
                        }}
                      />
                    );
                  })
                ) : (
                  <div className='empty-state'>No Mutual Servers</div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'FRIENDS' && (
          <>
            <div className='popout-section'>
              <div className='mutual-list'>
                {sharedFriends?.length ? (
                  sharedFriends.map((friend) => (
                    <MutualItem
                      key={friend.id}
                      title={friend.global_name || friend.username}
                      subtitle={`@${friend.username}`}
                      icon={`${localStorage.getItem('selectedCdnUrl')}/avatars/${friend.id}/${friend.avatar}.png`}
                      onClick={() => handleFriendClick(friend)}
                    />
                  ))
                ) : (
                  <div className='empty-state'>No Mutual Friends</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
