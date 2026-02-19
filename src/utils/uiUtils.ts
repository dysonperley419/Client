import type React from 'react';

import { useGateway } from '@/context/gatewayContext';
import { useModal } from '@/context/modalContext';
import { usePopup } from '@/context/popupContext';
import { type UserWithPresence, useUserStore } from '@/stores/userstore';
import type { Guild, Member, Role } from '@/types/guilds';

import { get } from './api';
import { logger } from './logger';

export const useUiUtilityActions = (selectedGuild: Guild | null) => {
  const { openPopup } = usePopup();
  const getUser = useUserStore((state) => state.getUser);
  const { getMember, guilds } = useGateway();
  const { openModal, updateModal } = useModal();
  const { closePopup } = usePopup();

  const openUserProfile = async (e: React.MouseEvent<HTMLElement>, member: Member) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left - 310;
    const y = rect.top;

    const userId = member.user?.id || member.id;
    if (!userId) return;

    const existingMember = selectedGuild ? getMember(selectedGuild.id, userId) : null;

    let userData: UserWithPresence = existingMember?.user || member.user;

    if (!userData || !userData.username) {
      try {
        userData = (await getUser(userId))!;
      } catch (err) {
        logger.error('PROFILE', `Failed to hydrate user ${userId}`, err);
      }
    }

    const memberReal: Member = {
      ...(existingMember ?? member),
      id: userId,
      user: userData || member.user || ({ id: userId } as any),
      nick: existingMember?.nick || member.nick || null,
      roles: existingMember?.roles || member.roles || [],
      joined_at: existingMember?.joined_at || member.joined_at || new Date().toISOString(),
    };

    const roleIds = memberReal.roles ?? [];
    let memberRoles: Role[] = [];

    if (selectedGuild) {
      memberRoles = roleIds
        .map((id) => selectedGuild.roles.find((r) => r.id === id))
        .filter((role): role is Role => !!role);
    }

    openPopup('USER_PROFILE_POPOUT', {
      x,
      y,
      member: memberReal,
      roles: memberRoles.length === 0 ? null : memberRoles,
    });
  };

  const openFullProfile = async (user: Member) => {
    closePopup();

    openModal('SERVER_PROFILE', { member: user });

    try {
      const query = new URLSearchParams({
        with_mutual_guilds: 'true',
        with_mutual_friends: 'true',
      }).toString();

      const fullProfile = await get(`/users/${user.id}/profile?${query}`);

      updateModal<'SERVER_PROFILE'>({
        mutual_guilds: fullProfile.mutual_guilds,
        mutual_friends: fullProfile.mutual_friends,
        connected_accounts: fullProfile.connected_accounts,
        premium_since: fullProfile.premium_since,
        premium_type: fullProfile.premium_type,
      });
    } catch (error) {
      logger.error(`SERVER_PROFILE`, `Failed to fetch full user profile from API!`, error);
    }
  };

  const openEmojiPopout = async (e: React.MouseEvent, emojiBase: { name: string; id: string }) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left;
    const y = rect.top - 120;

    let emojiDetails: any = null;

    const localGuild = guilds.find((g) => g.emojis?.some((em) => em.id === emojiBase.id));
    const localEmoji = localGuild?.emojis?.find((em) => em.id === emojiBase.id);

    if (localGuild && localEmoji) {
      emojiDetails = {
        ...localEmoji,
        guild_id: localGuild.id,
        guild_name: localGuild.name,
        is_private: false,
      };
    } else {
      try {
        emojiDetails = await get(`/emojis/${emojiBase.id}/public`);
      } catch (err) {
        logger.error('EMOJI_POPOUT', `Failed to fetch emoji ${emojiBase.id}`, err);
        return;
      }
    }

    openPopup('EMOJI_DETAILS_POPOUT', {
      x,
      y,
      emoji: {
        id: emojiDetails.id,
        name: emojiDetails.name || emojiBase.name,
        animated: emojiDetails.animated ?? false,
        guild_id: emojiDetails.guild_id,
        managed: emojiDetails.managed ?? false,
        require_colons: emojiDetails.require_colons ?? true,
        roles: emojiDetails.roles ?? [],
        user_id: emojiDetails.user_id ?? null,
        groups: emojiDetails.groups ?? null,
      },
      guildName: emojiDetails.guild_name,
      guildIcon: localGuild?.icon! ?? null,
      guildId: localGuild?.id!,
      isPrivate: emojiDetails.is_private ?? true,
    });
  };

  return { openUserProfile, openFullProfile, openEmojiPopout };
};
