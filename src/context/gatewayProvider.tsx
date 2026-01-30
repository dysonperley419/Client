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
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, number>>>({});
  const subscribedChannels = useRef<Record<string, string>>({});

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
            const guildId = parsed.guild_id;
            const existing = prev?.[guildId];
            const currentItems = existing?.id === parsed.id ? [...existing.items] : [];

            for (const op of parsed.ops) {
              switch (op.op) {
                case 'SYNC': {
                  const [start, end] = op.range;
                  const deleteCount = end - start + 1;
                  currentItems.splice(start, deleteCount, ...op.items);
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
                member_count: parsed.member_count ?? existing?.member_count ?? 0,
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
  };

  return <GatewayContext value={gatewayProps}>{children}</GatewayContext>;
};
