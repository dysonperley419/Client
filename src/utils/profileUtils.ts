import { useGateway } from '@/context/gatewayContext';
import { usePopup } from '@/context/popupContext';
import type { Guild, Member, Role } from '@/types/guilds';
import type { User } from '@/types/users';

export const useUserProfileActions = (selectedGuild: Guild | null) => {
  const { openPopup } = usePopup();
  const { getMember } = useGateway();

  const openUserProfile = (e: React.MouseEvent<HTMLElement>, user: User) => {
    if (!selectedGuild) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left - 310;
    const y = rect.top;

    const existingMember = getMember(selectedGuild.id, user.id);

    const member = existingMember ?? {
      id: user.id,
      user: user,
      nick: null,
      roles: [],
      joined_at: new Date().toISOString(),
      deaf: false,
      mute: false,
    };

    const roleIds = existingMember?.roles ?? [];
    const memberRoles: Role[] = roleIds
      .map((id) => selectedGuild.roles.find((r) => r.id === id))
      .filter((role): role is Role => !!role);

    openPopup('USER_PROFILE_POPOUT', {
      x,
      y,
      member: member as Member,
      roles: memberRoles,
    });
  };

  return { openUserProfile };
};
