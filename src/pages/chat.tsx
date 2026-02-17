import { type JSX, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useModal } from '@/context/modalContext';
import { useVoice } from '@/hooks/useVoice';
import type { Channel } from '@/types/channel';
import type { GatewayContextSchema } from '@/types/gatewayContext';
import type { Guild } from '@/types/guilds';
import type { Relationship } from '@/types/relationship';

import ChannelSidebar from '../components/chat/channelSidebar';
import { FriendsList } from '../components/chat/friendsList';
import GuildSidebar from '../components/chat/guildSidebar';
import MainContent from '../components/chat/mainContent';
import NoTextChannels from '../components/chat/noTextChannels';
import Settings from '../components/chat/settings';
import { useGateway } from '../context/gatewayContext';
import LoadingScreen from './loading';
import type { User } from '@/types/users';

const ChatApp = (): JSX.Element => {
  const {
    isReady,
    guilds,
    user,
    relationships,
    requestMembers,
    privateChannels,
  }: GatewayContextSchema = useGateway();
  const { guildId, channelId } = useParams();
  const { openModal } = useModal();
  const { connectToVoice } = useVoice();

  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [localFriends, setLocalFriends] = useState<Relationship[] | []>([]);
  const [passedGuilds, setPassedGuilds] = useState<Guild[]>([]);
  const [unreads, setUnreads] = useState<Map<string, Set<string>>>(new Map());
  const [mentions, setMentions] = useState<Map<string, Map<string, number>>>(new Map());

  const selectedGuild = passedGuilds.find((g) => g.id === guildId) ?? null;
  const selectedChannel = selectedGuild
    ? (selectedGuild.channels.find((c) => c.id === channelId) ?? null)
    : ((privateChannels as Channel[])?.find((c) => c.id === channelId) ?? null);


  useEffect(() => {
    if (isReady && guildId && channelId && requestMembers) {
      requestMembers(guildId, channelId);
    }
  }, [guildId, channelId, isReady, requestMembers]);

  useEffect(() => {
    if (guilds.length > 0) {
      setPassedGuilds(guilds);
    }
  }, [guilds]);

  useEffect(() => {
    setLocalFriends(relationships);
  }, [relationships]);

  useEffect(() => {
    const handleNewGuild = (event: Event) => {
      const newGuild = (event as CustomEvent<Guild>).detail;

      setPassedGuilds((prev) => {
        if (prev.some((x) => x.id === newGuild.id)) return prev;

        const firstTextChannel = newGuild.channels.find((c: Channel) => c.type === 0);

        if (firstTextChannel) {
          void navigate(`/channels/${newGuild.id}/${firstTextChannel.id}`);
        } else {
          void navigate(`/channels/${newGuild.id}`);
        }

        return [...prev, newGuild];
      });
    };

    const handleGuildRemove = (event: Event) => {
      const deletedId = (event as CustomEvent<Guild>).detail.id;

      setPassedGuilds((prev) => prev.filter((guild) => guild.id !== deletedId));

      if (window.location.pathname.includes(deletedId)) {
        void navigate('/channels/@me');
      }
    };

    const handleRelationshipAdd = (event: Event) => {
      const newRelationship = (event as CustomEvent<Relationship>).detail;

      setLocalFriends((prev) => {
        if (prev.some((f) => f.id === newRelationship.id)) {
          return prev.map((f) => (f.id === newRelationship.id ? newRelationship : f));
        }

        return [...prev, newRelationship];
      });
    };

    const handleRelationshipRemove = (event: Event) => {
      const removedRelationship = (event as CustomEvent<Relationship>).detail;

      setLocalFriends((prev) => prev.filter((f) => f.id !== removedRelationship.id));
    };

    const handleNewMessage = (event: Event) => {
      const newMessage = (event as CustomEvent).detail;
      const gId = newMessage.guild_id;
      const cId = newMessage.channel_id;

      if (!gId || cId === selectedChannel?.id) return;

      const authorId = newMessage.author?.id;

      if (authorId === user?.id) {
        return;
      }

      const isMentioned =
        newMessage.mentions?.some((m: User) => m.id === user?.id) ||
        newMessage.mention_everyone;

      if (isMentioned) {
        setMentions((prev) => {
          const next = new Map(prev);
          const guildMap = new Map(next.get(gId) ?? []);
          const currentCount = guildMap.get(cId) ?? 0;

          guildMap.set(cId, currentCount + 1);
          next.set(gId, guildMap);
          return next;
        });
      } else {
        setUnreads((prev) => {
          const next = new Map(prev);
          const guildSet = new Set(next.get(gId) ?? []);

          guildSet.add(cId);
          next.set(gId, guildSet);
          return next;
        });
      }
    };

    window.addEventListener('gateway_relationship_add', handleRelationshipAdd);
    window.addEventListener('gateway_relationship_remove', handleRelationshipRemove);
    window.addEventListener('gateway_guild_create', handleNewGuild);
    window.addEventListener('gateway_message_create', handleNewMessage);
    window.addEventListener('gateway_guild_delete', handleGuildRemove);

    return () => {
      window.removeEventListener('gateway_guild_create', handleNewGuild);
      window.removeEventListener('gateway_guild_delete', handleGuildRemove);
      window.removeEventListener('gateway_message_create', handleNewMessage);
      window.removeEventListener('gateway_relationship_add', handleRelationshipAdd);
      window.removeEventListener('gateway_relationship_remove', handleRelationshipRemove);
    };
  }, [selectedChannel?.id, selectedGuild, user, navigate]);

  useEffect(() => {
    if (selectedGuild && selectedGuild.id && selectedChannel && selectedChannel.id) {
      setUnreads((prev) => {
        if (!prev.has(selectedGuild.id)) {
          return prev;
        }

        const next = new Map(prev);
        const guildSet = new Set(next.get(selectedGuild.id));

        guildSet.delete(selectedChannel.id);

        if (guildSet.size === 0) {
          next.delete(selectedGuild.id);
        } else {
          next.set(selectedGuild.id, guildSet);
        }

        return next;
      });

      setMentions((prev) => {
        if (!prev.has(selectedGuild.id)) {
           return prev;
        }

        const next = new Map(prev);
        const guildMap = new Map(next.get(selectedGuild.id));

        guildMap.delete(selectedChannel.id);

        if (guildMap.size === 0) {
          next.delete(selectedGuild.id);
        } else {
          next.set(selectedGuild.id, guildMap);
        }

        return next;
      });
    }
  }, [selectedGuild, selectedChannel]);

  const handleManualRemoveFriend = (userId: string) => {
    setLocalFriends((prev) => prev.filter((f) => f.id !== userId));
  };

  const handleManualUpdateFriend = (updatedFriend: Relationship) => {
    setLocalFriends((prev) => prev.map((f) => (f.id === updatedFriend.id ? updatedFriend : f)));
  };

  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    window.addEventListener('ui_open_settings', handleOpenSettings);

    return () => {
      window.removeEventListener('ui_open_settings', handleOpenSettings);
    };
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  const handleSelectGuild = (guild: Guild) => {
    void navigate(`/channels/${guild.id}`);
  };

  const handleVoiceConnection = (channel: Channel) => {
    if (!selectedGuild) {
      return; //only support guild calls for now
    }

    const webrtc_p2p =
      JSON.parse(localStorage.getItem('developerSettings') ?? '{}').webrtc_p2p ?? false;

    if (webrtc_p2p) {
      openModal('CONFIRMATION_CONNECT_P2P', {
        channel: channel,
        name: channel.name!,
        guild_id: channel.guild_id ?? null,
      });
    } else {
      connectToVoice(channel.guild_id ?? null, channel);
    }
  };

  const handleSelectChannel = (channel: Channel | null) => {
    if (channel?.type === 2) {
      handleVoiceConnection(channel);
    }
    const gId = guildId ?? '@me';
    const cId = channel?.id ?? '';
    void navigate(`/channels/${gId}/${cId}`);
  };

  return (
    <div className='page-wrapper'>
      {showSettings && (
        <Settings
          user={user}
          onClose={() => {
            setShowSettings(false);
          }}
        ></Settings>
      )}

      {!showSettings && (
        <div className='chat-layout'>
          <GuildSidebar
            guilds={passedGuilds}
            selectedGuildId={guildId}
            onSelectGuild={handleSelectGuild}
            unreads={unreads}
            mentions={mentions}
          />
          <ChannelSidebar
            selectedGuild={selectedGuild}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
            unreads={unreads}
            mentions={mentions}
          />

          {selectedChannel ? (
            <MainContent selectedChannel={selectedChannel} selectedGuild={selectedGuild} />
          ) : !selectedGuild ? (
            <FriendsList
              friends={localFriends}
              onRequestUpdate={handleManualUpdateFriend}
              onRequestDelete={handleManualRemoveFriend}
            />
          ) : (
            <NoTextChannels />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatApp;
