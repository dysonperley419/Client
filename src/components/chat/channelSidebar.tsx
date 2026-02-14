import './channelSidebar.css';

import { type JSX, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAssetsUrl } from '@/context/assetsUrl';
import { useGateway } from '@/context/gatewayContext';
import type { Channel } from '@/types/channel';
import type { Guild } from '@/types/guilds';
import { del } from '@/utils/api';
import { getDefaultAvatar } from '@/utils/avatar';
import { logger } from '@/utils/logger';

import { DmChannel } from './dmChannel';
import VoiceActivityControls from './voiceActivityControls';

interface ChannelSidebarProps {
  selectedGuild?: Guild | null;
  selectedChannel?: Channel | null;
  onSelectChannel: (channel: Channel | null) => void;
}

const handleCloseDM = async (channelid: string) => {
  try {
    await del(`/channels/${channelid}`);
  } catch (error) {
    logger.error(`CHANNEL_SIDEBAR`, `Failed to close DM`, error);
  }
};

const PrivateChannelItem = ({
  channel,
  navigate,
  selected,
  onCloseLocal,
}: {
  channel: Channel;
  navigate: any;
  selected: boolean;
  onCloseLocal: () => void;
}) => {
  const recipient = channel.recipients?.[0];
  const { url: defaultAvatarUrl } = useAssetsUrl(
    `/assets/${getDefaultAvatar(recipient) ?? ''}.png`,
  );

  const channelName =
    channel.name || recipient?.global_name || recipient?.username || 'Unknown User';
  const avatarUrl = recipient?.avatar
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${recipient.id}/${recipient.avatar}.png`
    : defaultAvatarUrl;

  return (
    <DmChannel
      key={channel.id}
      title={channelName}
      subtitle={channel.last_message_id ? 'Message history' : 'No messages yet'}
      icon={avatarUrl}
      selected={selected}
      onClose={async () => {
        onCloseLocal();

        await handleCloseDM(channel.id);
      }}
      onClick={() => {
        navigate(`/channels/@me/${channel.id}`);
      }}
    />
  );
};

const ChannelSidebar = ({
  selectedGuild,
  selectedChannel,
  onSelectChannel,
}: ChannelSidebarProps): JSX.Element => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const { privateChannels: globalPrivateChannels } = useGateway();
  const [closedChannelIds, setClosedChannelIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const visiblePrivateChannels = ((globalPrivateChannels as Channel[]) || []).filter(
    (channel) => !closedChannelIds.includes(channel.id),
  );

  if (!selectedGuild) {
    return (
      <div id='channels-column'>
        <div className='sidebar-header'>
          <div className='search-bar-fake'>
            <span className='search-text'>Find or start a conversation</span>
          </div>
        </div>

        <div className='scroller_hide'>
          <div className='no-channels-sidebar-wrapper'>
            <button
              className={`sidebar-btn ${!selectedChannel ? 'active' : ''}`}
              onClick={() => {
                onSelectChannel(null);
              }}
            >
              <div className='icon-wrapper'>
                <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                  group
                </span>
              </div>
              <span className='sidebar-text'>Friends</span>
            </button>
          </div>

          <div className='dm-section'>
            <div className='dm-header'>
              <span className='dm-header-text'>Direct Messages</span>
              <button className='dm-add-btn'>
                <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                  add
                </span>
              </button>
            </div>
            <div className='dm-list'>
              {visiblePrivateChannels.length > 0 &&
                visiblePrivateChannels.map((channel) => (
                  <PrivateChannelItem
                    key={channel.id}
                    channel={channel}
                    navigate={navigate}
                    selected={selectedChannel?.id === channel.id}
                    onCloseLocal={() => {
                      setClosedChannelIds((prev) => [...prev, channel.id]);

                      if (selectedChannel?.id === channel.id) {
                        onSelectChannel(null);
                        navigate('/channels/@me');
                      }
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
        <VoiceActivityControls />
      </div>
    );
  }

  const allChannels = selectedGuild.channels;
  allChannels.sort((a: Channel, b: Channel) => a.position - b.position);

  const categoryChannels = allChannels.filter((c: Channel) => c.type === 4); //Text Channels, Voice Channels, other channels..
  const categorizedChannels = allChannels.filter(
    (c: Channel) => c.parent_id !== null && allChannels.some((c2) => c.parent_id === c2.id),
  );
  const nonCategorizedChannels = allChannels.filter(
    (c: Channel) => !categoryChannels.includes(c) && !categorizedChannels.includes(c),
  );

  const renderChannel = (channel: Channel) => (
    <button
      key={channel.id}
      className={`sidebar-btn ${selectedChannel?.id === channel.id ? 'active' : ''} ${channel.type === 2 ? 'not-selectable' : ''}`}
      onClick={() => {
        onSelectChannel(channel);
      }}
    >
      <div className='sidebar-icon'>
        <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
          {channel.type === 2 ? 'volume_up' : 'tag'}
        </span>
      </div>
      <span className='sidebar-text'>{channel.name}</span>
    </button>
  );

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const bannerUrl = selectedGuild.banner
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/banners/${selectedGuild.id}/${selectedGuild.banner}.png`
    : null;

  return (
    <div id='channels-column'>
      <div className={`sidebar-header ${bannerUrl != null ? 'sidebar-header-banner' : ''}`}>
        {bannerUrl != null && (
          <div className='sidebar-header-banner-bg'>
            <img src={bannerUrl} alt='' className='sidebar-header-banner-image' />
            <div className='sidebar-header-banner-gradient'></div>
          </div>
        )}
        <div className='sidebar-header-content'>
          <span className='guild-name'>{selectedGuild.name}</span>
          <span
            className='material-symbols-rounded sidebar-header-arrow'
            style={{ fontSize: '24px' }}
          >
            expand_more
          </span>
        </div>
      </div>

      <div className='scroller_hide'>
        {categoryChannels
          .sort((a: Channel, b: Channel) => a.position - b.position)
          .map((category: Channel) => {
            const isCollapsed = collapsedCategories[category.id];
            const children = categorizedChannels
              .filter((c: Channel) => c.parent_id === category.id)
              .sort((a: Channel, b: Channel) => a.position - b.position);

            return (
              <div key={category.id} className='category-wrapper'>
                <button
                  className='category-header'
                  onClick={() => {
                    toggleCategory(category.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`arrow-icon ${isCollapsed ? 'collapsed' : ''}`}>
                    <span className='material-symbols-rounded' style={{ fontSize: '12px' }}>
                      expand_more
                    </span>
                  </div>
                  {category.name?.toUpperCase()}
                </button>
                {!isCollapsed && (
                  <div className='category-children'>{children.map(renderChannel)}</div>
                )}
              </div>
            );
          })}

        {nonCategorizedChannels.map((channel: Channel) => (
          <div key={`wrapper-${channel.id}`} className='category-children'>
            {renderChannel(channel)}
          </div>
        ))}
      </div>

      <VoiceActivityControls />
    </div>
  );
};

export default ChannelSidebar;
