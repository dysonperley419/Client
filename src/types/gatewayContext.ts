import type { GuildMemberListUpdate } from './gateway';
import type { Guild } from './guilds';
import type { Presence, Session } from './presences';
import type { Relationship } from './relationship';
import type { User } from './users';
import type { UserSettings } from './userSettings';

export interface GatewayContextSchema {
  isReady: boolean | null;
  guilds: Guild[] | [];
  user: User | null;
  relationships: Relationship[] | [];
  user_settings: UserSettings | null;
  sessions: Session[];
  presences: Record<string, Presence>;
  requestMembers?: (guildId: string, channelId: string, ranges?: number[][]) => void;
  typingUsers: Record<string, Record<string, number>>;
  memberLists?: Record<string, GuildMemberListUpdate>;
}
