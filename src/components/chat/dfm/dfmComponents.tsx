/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import './dfm.css';

import { type JSX, useEffect, useState } from 'react';

import { useGateway } from '@/context/gatewayContext';
import { useUserStore } from '@/stores/userstore';
import type { Channel } from '@/types/channel';
import type { Guild, Member, Role } from '@/types/guilds';
import type { User } from '@/types/users';
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
          openUserProfile(e, member! ?? fakeMemberObj);
        }
      }}
      className='user-msg-mention'
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
  const render = (channel: Channel | undefined) => {
    return <strong>#{channel?.name ?? 'unknown'}</strong>;
  };

  const { guilds } = useGateway();
  const guild: Guild | undefined = guilds.find((guild) => guild.id == guild_id);
  if (!guild) return render(undefined);

  const channel: Channel | undefined = guild.channels.find((channel) => channel.id === channel_id);
  return render(channel);
};

export const EmojiMention = ({ name, emoji_id }: { name: string; emoji_id: string }): JSX.Element => {
  const { guilds } = useGateway();
  const contextGuild = guilds.find((g) => g.emojis?.some((e) => e.id === emoji_id));
  const { openEmojiPopout } = useUiUtilityActions(contextGuild || null);

  const invalid = /\D/.test(emoji_id);
  if (invalid) return <></>;

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