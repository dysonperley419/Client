/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import './dfm.css';

import { type JSX, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGateway } from '@/context/gatewayContext';
import { useUserStore } from '@/stores/userstore';
import type { Channel } from '@/types/channel';
import type { Guild, Member, Role } from '@/types/guilds';
import type { User } from '@/types/users';
import { get, post } from '@/utils/api';
import { logger } from '@/utils/logger';
import { useUiUtilityActions } from '@/utils/uiUtils';

export const MemberMention = ({
  guild_id,
  user_id,
}: {
  guild_id: string | undefined;
  user_id: string;
}): JSX.Element => {
  const { getMember, guilds, getPresence } = useGateway();
  const getUser = useUserStore((state) => state.getUser);
  const contextGuild = guilds.find((x: Guild) => x.id === guild_id);

  const { openUserProfile } = useUiUtilityActions(contextGuild!);
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);

  const member = getMember(guild_id, user_id);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const user = await getUser(user_id);

      if (isMounted && user) {
        setFetchedUser(user as User);
      }
    };

    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [user_id, getUser]);

  const name: string = member?.nick || fetchedUser?.global_name || fetchedUser?.username || '...';

  let fakeMemberObj: Member = {
    id: user_id,
    user: {
      id: user_id,
      username: 'someone',
      discriminator: '0000',
    },
    roles: [],
    joined_at: new Date().toISOString(),
  };

  if (fetchedUser) {
    const presence = getPresence(fetchedUser.id);
    const status = presence?.status ?? 'offline';

    fakeMemberObj = {
      id: fetchedUser.id,
      user: fetchedUser,
      presence: {
        user: fetchedUser,
        status: status,
        activities: [],
      },
      joined_at: new Date().toISOString(),
      roles: [],
    };
  }

  return (
    <strong
      onClick={(e) => {
        if (fetchedUser) {
          void openUserProfile(e, member! ?? fakeMemberObj);
        }
      }}
      className='inline-msg-mention'
    >
      @{name}
    </strong>
  );
};

export const RoleMention = ({
  guild_id,
  channel_id,
}: {
  guild_id: string | undefined;
  channel_id: string;
}): JSX.Element => {
  const render = (role: Role | undefined) => {
    return <strong>@{role?.name ?? 'unknown'}</strong>;
  };

  const { guilds } = useGateway();
  const guild: Guild | undefined = guilds.find((guild) => guild.id == guild_id);
  if (!guild) return render(undefined);

  const role: Role | undefined = guild.roles.find((role) => role.id === channel_id);
  return render(role);
};

export const EveryoneMention = (): JSX.Element => {
  return <strong>@everyone</strong>;
};

export const HereMention = (): JSX.Element => {
  return <strong>@here</strong>;
};

export const ChannelMention = ({
  guild_id,
  channel_id,
}: {
  guild_id: string | undefined;
  channel_id: string;
}): JSX.Element => {
  const navigate = useNavigate();
  const render = (channel: Channel | undefined) => {
    return <strong className='inline-msg-mention' onClick={(e) => {
      e.stopPropagation();
      void navigate(`/channels/${channel?.guild_id}/${channel?.id}`);
    }}>#{channel?.name ?? 'unknown'}</strong>;
  };

  const { guilds } = useGateway();
  const guild: Guild | undefined = guilds.find((guild) => guild.id == guild_id);
  if (!guild) return render(undefined);

  const channel: Channel | undefined = guild.channels.find((channel) => channel.id === channel_id);
  return render(channel);
};

export const EmojiMention = ({
  name,
  emoji_id,
}: {
  name: string;
  emoji_id: string;
}): JSX.Element => {
  const { guilds } = useGateway();
  const contextGuild = guilds.find((g) => g.emojis?.some((e) => e.id === emoji_id));
  const { openEmojiPopout } = useUiUtilityActions(contextGuild || null);

  const invalid = /\D/.test(emoji_id);
  if (invalid) return <></>; //Invalid and probably dangerous. Do not render or just a fucking idiot made these.

  const emojiUrl = `${localStorage.getItem('selectedCdnUrl') ?? ''}/emojis/${emoji_id}.png`;

  return (
    <img
      className='emoji'
      alt={name}
      src={emojiUrl}
      onClick={(e) => openEmojiPopout(e, { name, id: emoji_id })}
    />
  );
};

export const OffsiteMedia = ({ src } : {
  src: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const type = src.toLowerCase().endsWith('.gif') ? "gif" : "img";

  return (
    <div className="gif-embed-container">
      <img
        src={`https://staging.oldcordapp.com/proxy/${encodeURIComponent(src)}`} //you're welcome. make this use the instance configured's proxy ASAP.
        alt={type.toUpperCase()}
        className={`chat-gif-render ${isExpanded ? 'is-big' : ''}`}
        loading="lazy"
        onError={(e) => (e.currentTarget.style.display = 'none')}
        onClick={() => setIsExpanded(!isExpanded)}
      />
    </div>
  )
};

export const InviteMention = ({ code }: { code: string }): JSX.Element => {
  const { guilds } = useGateway();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchInvite = async () => {
      try {
        const response = await get(`/invites/${code}?with_counts=true`);

        if (isMounted) {
          setInviteData(response);
        }
      } catch (err) {
        logger.error(`INVITE_MENTION`, `Failed to fetch invite: ${code}`, err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchInvite();
    return () => {
      isMounted = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className='invite-card invite-card-loading'>
        <div className='invite-card-inner'>
          <div className='invite-header'>LOADING INVITE...</div>
          <div className='invite-body'>
            <div className='invite-guild-icon-placeholder loading-shimmer' />
            <div className='invite-text'>
              <div className='loading-bar long' />
              <div className='loading-bar short' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className='invite-card invite-card-error'>
        <div className='invite-card-inner'>
          <div className='invite-header'>YOU WERE SENT AN INVITE, BUT...</div>
          <div className='invite-body no-gap'>
            <span className='material-symbols-rounded invite-error-icon'>close</span>
            <div className='invite-text'>
              <div className='invite-error-title'>Invalid Invite</div>
              <div className='invite-error-sub'>Try sending a new invite!</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const joinAndGotoServer = async (code: string) => {
    try {
      const response = await post(`/invites/${code}`, {});
      const guild_id = response?.guild_id || response?.guild?.id;

      if (guild_id) {
        void navigate(`/channels/${guild_id}`);
      }
    } catch (err) {
      setInviteData(null);

      logger.error(`INVITE_MENTION`, `Failed to join server from invite: ${code}`, err);
    }
  };

  const guild = inviteData.guild;
  const bannerUrl = guild.banner
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/banners/${guild.id}/${guild.banner}.png`
    : null;
  const iconUrl = guild.icon
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/icons/${guild.id}/${guild.icon}.png`
    : null;
  const inviterAvatar = inviteData.inviter?.avatar
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${inviteData.inviter.id}/${inviteData.inviter.avatar}.png`
    : null;
  const inServerAlready = guilds.some((g: Guild) => g.id === guild.id);

  return (
    <div className='invite-card'>
      {bannerUrl && (
        <div className='invite-banner' style={{ backgroundImage: `url(${bannerUrl})` }} />
      )}
      <div className='invite-card-inner'>
        <div className='invite-header'>YOU'VE BEEN INVITED TO JOIN A SERVER</div>
        <div className='invite-body'>
          <div className='invite-guild-info'>
            {iconUrl ? (
              <img src={iconUrl} className='invite-guild-icon' alt='' />
            ) : (
              <div className='invite-guild-icon-placeholder'>{guild.name.charAt(0)}</div>
            )}
            <div className='invite-text'>
              <div className='invite-guild-name'>{guild.name}</div>
              <div className='invite-channel-row'>
                <span className='invite-channel-name'>#{inviteData.channel?.name}</span>
              </div>

              {inviteData.inviter && (
                <div className='invite-inviter'>
                  {inviterAvatar && <img src={inviterAvatar} alt='' />}
                  <span>Invited by {inviteData.inviter.username}</span>
                </div>
              )}
            </div>
          </div>
          <button
            className='invite-join-button'
            onClick={() => {
              if (inServerAlready) {
                void navigate(`/channels/${guild.id}`);
              } else {
                void joinAndGotoServer(code);
              }
            }}
          >
            {inServerAlready ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
};
