import { useGateway } from '@/context/gatewayContext';
import { PermissionHelper } from '@/utils/permissions';

export const usePermissions = (guildId?: string) => {
  const { memberLists, user, guilds } = useGateway();

  if (!guildId || !user) return new PermissionHelper(0n, false);

  const items = memberLists?.[guildId]?.items ?? [];
  const thatsME = items.find((i) => i.member?.user.id === user.id)?.member;
  const guild = guilds.find((x) => x.id === guildId);

  if (!thatsME || !guild) return new PermissionHelper(0n, false);

  const everyoneRole = guild.roles.find((r) => r.id === guildId);
  let permissions = BigInt(everyoneRole?.permissions ?? 0n);

  thatsME.roles.forEach((roleId) => {
    const role = guild.roles.find((r) => r.id === roleId);
    if (role) {
      permissions |= BigInt(role.permissions);
    }
  });

  if (guild.owner_id === user.id) {
    return new PermissionHelper(permissions, true);
  }

  return new PermissionHelper(permissions, false);
};
