import type { GuildMemberListState } from '@/types/gatewayContext';
import type { Guild, Member } from '@/types/guilds';

export const getMember = (memberLists: Record<string, GuildMemberListState> | undefined, guild_id: string | null | undefined, user_id: string | null | undefined): Member | null => {
  //lord have mercy
  if (!memberLists || !guild_id)
    return null;
  else
    return memberLists[guild_id]?.items.find((item) => item.member?.id === user_id)?.member ?? null;
};

export const getMemberColor = (member: Member, guild?: Guild | null): string | undefined => {
  if (!guild || member.roles.length === 0) return undefined;

  const memberRoles = guild.roles.filter((r) => member.roles.includes(r.id));

  memberRoles.sort((a, b) => b.position - a.position);

  const colorRole = memberRoles.find((r) => r.color !== 0);
  if (colorRole) {
    return `#${colorRole.color.toString(16).padStart(6, '0')}`;
  }
  return undefined;
};