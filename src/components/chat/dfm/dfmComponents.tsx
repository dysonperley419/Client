import './dfm.css';

import type { JSX } from 'react';

import { useGateway } from '@/context/gatewayContext';
import { type UserStore, useUserStore } from '@/stores/userstore';
import type { Channel } from '@/types/channel';
import type { Guild, Role } from '@/types/guilds';
import type { User } from '@/types/users';
import { useUserProfileActions } from '@/utils/profileUtils';

export const MemberMention = ({
  guild_id,
  user_id,
}: {
  guild_id: string | undefined;
  user_id: string;
}): JSX.Element => {
  const { getMember, guilds } = useGateway();
  const storedUsers = useUserStore((state: UserStore) => state.users);
  const contextGuild = guilds.find((x: Guild) => x.id === guild_id)!;

  const { openUserProfile } = useUserProfileActions(contextGuild);

  const member = getMember(guild_id, user_id);
  const storedUser = storedUsers[user_id];

  const name: string = member?.nick || storedUser?.global_name || storedUser?.username || 'unknown';

  return (
    <strong
      onClick={(e) => {
        openUserProfile(e, storedUser as User);
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

export const Emoji = ({ name, emoji_id }: { name: string; emoji_id: string }): JSX.Element => {
  const invalid = /\D/.test(emoji_id);
  if (invalid) return <></>; //Invalid and probably dangerous. Do not render.

  const emojiUrl = `${localStorage.getItem('selectedCdnUrl') ?? ''}/emojis/${emoji_id}.png`;
  return <img className='emoji' alt={name} src={emojiUrl}></img>;
};
