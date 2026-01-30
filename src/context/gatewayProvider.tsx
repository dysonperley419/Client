import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import {
  GatewayPayloadSchema,
  GuildMemberListUpdateSchema,
  HelloSchema,
  MessageCreateSchema,
  PresenceUpdateSchema,
  ReadyEventSchema,
  TypingStartSchema,
} from '@/types/gateway';
import type { GatewayContextSchema } from '@/types/gatewayContext';
import type { Guild } from '@/types/guilds';
import { type Session, SessionListSchema } from '@/types/presences';
import type { Relationship } from '@/types/relationship';
import type { User } from '@/types/users';
import type { UserSettings } from '@/types/userSettings';

import { GatewayContext } from './gatewayContext';

interface GatewayProviderProps {
  children?: ReactNode;
  isReady?: boolean;
  guilds?: Guild[];
  user?: User;
}

export const GatewayProvider = ({ children }: GatewayProviderProps) => {
  const socket = useRef<WebSocket | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [presences, setPresences] = useState<GatewayContextSchema['presences']>({});
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [memberLists, setMemberLists] = useState<GatewayContextSchema['memberLists'] | undefined>(
    {},
  );
  const memberListsRef = useRef(memberLists);
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, number>>>({});
  const subscribedChannels = useRef<Record<string, string>>({});

  useEffect(() => {
    memberListsRef.current = memberLists;
  }, [memberLists]);

  const requestMembers = useCallback((guildId: string, channelId: string, ranges = [[0, 99]]) => {
    subscribedChannels.current[guildId] = channelId;
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          op: 14,
          d: {
            guild_id: guildId,
            channels: { [channelId]: ranges },
          },
        }),
      );
    }
  }, []);

  const handleDispatch = useCallback(
    (type: string, data: unknown) => {
      switch (type) {
        case 'READY': {
          const parsed = ReadyEventSchema.parse(data);
          setUser(parsed.user);
          setRelationships(parsed.relationships);
          setUserSettings(parsed.user_settings);
          setGuilds(parsed.guilds);
          setSessions(parsed.sessions ?? []);
          setIsReady(true);
          break;
        }

        case 'SESSIONS_REPLACE': {
          const parsed = SessionListSchema.parse(data);
          setSessions(parsed);
          break;
        }

        case 'MESSAGE_CREATE': {
          const parsed = MessageCreateSchema.parse(data);
          window.dispatchEvent(new CustomEvent('gateway_message', { detail: parsed }));

          setTypingUsers((prev) => {
            const channelTyping = { ...prev[parsed.channel_id] };

            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Yeah I know and this is completely needed, just shut up about it.
            const { [parsed.author.id ?? '']: _, ...remainingTyping } = channelTyping;
            return { ...prev, [parsed.channel_id]: remainingTyping };
          });
          break;
        }

        case 'GUILD_CREATE':
          window.dispatchEvent(new CustomEvent('gateway_guild_create', { detail: data }));
          break;
        case 'GUILD_DELETE':
          window.dispatchEvent(new CustomEvent('gateway_guild_delete', { detail: data }));
          break;

        case 'GUILD_MEMBER_LIST_UPDATE': {
          const parsed = GuildMemberListUpdateSchema.parse(data);
          setMemberLists((prev) => {
            /*
              One thing deviated from Discord's implementation is to handle "Partial Sync" states.
              Spacebar's OP14 is broken. The fact is that it thinks range should be [0, online member count] goes
              against what OP14 should be. So once we determine a Spacebar instance by fetching members once to get this "Partial Sync" behavior,
              fetch all online members, and then filter it down to 100 items like Discord.
            */
            const guildId = parsed.guild_id;
            const existing = prev?.[guildId];
            const isSameId = existing?.id === parsed.id;
            let currentItems = isSameId ? [...existing.items] : [];
            let isPartial = isSameId ? (existing.partial ?? false) : false;

            for (const op of parsed.ops) {
              switch (op.op) {
                case 'SYNC': {
                  const [start, end] = op.range;
                  const rangeLength = end - start + 1;

                  const fetchedLength = op.items.length;
                  let onlineMemberCount = parsed.online_count ?? existing?.online_count ?? 0;

                  // Prevent lag lol
                  onlineMemberCount =
                    onlineMemberCount > 100
                      ? Math.ceil(onlineMemberCount * 0.25)
                      : onlineMemberCount;

                  currentItems.splice(start, rangeLength, ...op.items);

                  const isSpacebar =
                    (fetchedLength < rangeLength && end < onlineMemberCount - 1) ||
                    fetchedLength > rangeLength;

                  if (isSpacebar) {
                    if (!isPartial) {
                      isPartial = true;
                      const channelId = subscribedChannels.current[guildId];
                      if (channelId) {
                        setTimeout(() => {
                          requestMembers(guildId, channelId, [[0, onlineMemberCount + 1]]);
                        }, 0);
                      }
                    }

                    const filteredItems = currentItems.filter((item) => {
                      if (item.group?.id === 'offline') return false;
                      if (item.member?.presence?.status === 'offline') return false;
                      return true;
                    });

                    currentItems = filteredItems.slice(0, 100);
                  } else {
                    isPartial = false;
                  }
                  break;
                }
                case 'INSERT': {
                  currentItems.splice(op.index, 0, op.item);
                  break;
                }
                case 'UPDATE': {
                  currentItems[op.index] = op.item;
                  break;
                }
                case 'DELETE': {
                  currentItems.splice(op.index, 1);
                  break;
                }
                case 'INVALIDATE': {
                  const channelId = subscribedChannels.current[guildId];
                  if (channelId) {
                    requestMembers(guildId, channelId, [op.range]);
                  }
                  break;
                }
              }
            }

            return {
              ...prev,
              [guildId]: {
                id: parsed.id,
                items: currentItems,
                groups: parsed.groups,
                member_count: isPartial
                  ? currentItems.length
                  : (parsed.member_count ?? existing?.member_count ?? 0),
                partial: isPartial,
              },
            };
          });
          break;
        }

        case 'TYPING_START': {
          const parsed = TypingStartSchema.parse(data);
          setTypingUsers((prev) => ({
            ...prev,
            [parsed.channel_id]: {
              ...(prev[parsed.channel_id] ?? {}),
              [parsed.user_id]: Date.now(),
            },
          }));
          break;
        }

        case 'PRESENCE_UPDATE': {
          const parsed = PresenceUpdateSchema.parse(data);
          const userId = parsed.user.id;
          if (userId) {
            setPresences((prev) => ({ ...prev, [userId]: parsed }));
          }
          break;
        }

        default:
          break;
      }
    },
    [requestMembers],
  );

  const startHeartbeat = useCallback((interval: number, ws: WebSocket) => {
    return window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 1, d: null }));
      }
    }, interval);
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('Authorization') ?? '';
    const gatewayUrl = localStorage.getItem('selectedGatewayUrl');

    if (gatewayUrl && gatewayUrl.length > 0) {
      const ws = new WebSocket(gatewayUrl);
      socket.current = ws;
      let heartbeatId: number | undefined;

      ws.onopen = () => {
        const identifyPayload = {
          op: 2,
          d: {
            token: token,
            capabilities: 125,
            properties: { os: 'Windows', browser: 'Chrome' },
          },
        };
        ws.send(JSON.stringify(identifyPayload));
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        const payload = GatewayPayloadSchema.parse(JSON.parse(event.data));
        const { op, t, d } = payload;

        switch (op) {
          case 0:
            handleDispatch(t ?? '', d);
            break;
          case 10:
            heartbeatId = startHeartbeat(HelloSchema.parse(d).heartbeat_interval, ws);
            break;
        }
      };

      return () => {
        if (heartbeatId) clearInterval(heartbeatId);
        ws.close();
      };
    }

    return () => {
      /* no-op */
    };
    /*
      Discord clients determine that typing has stopped somewhat heuristically. If a message is sent, or if there has been no activity for 5 to 10 seconds, typing is assumed to have stopped.
    */
  }, [handleDispatch, startHeartbeat]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup();
    };
  }, [connect]);

  const gatewayProps: GatewayContextSchema = {
    isReady,
    guilds,
    user,
    relationships,
    user_settings: userSettings,
    sessions,
    presences,
    requestMembers,
    typingUsers,
    memberLists,
    memberListsRef,
  };

  return <GatewayContext value={gatewayProps}>{children}</GatewayContext>;
};
