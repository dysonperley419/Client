import { createContext, useContext } from 'react';

import type { Emoji, Member, Role } from '@/types/guilds';

export interface PopupDataMap {
  USER_PROFILE_POPOUT: { x: number; y: number; member: Member; roles: Role[] | null };
  CURRENT_USER_PROFILE: { x: number; y: number };
  EMOJI_DETAILS_POPOUT: {
    x: number;
    y: number;
    emoji: Emoji;
    guildIcon?: string;
    guildId: string;
    guildName: string;
    isPrivate: boolean;
  }
}

export type PopupType = keyof PopupDataMap;

interface PopupContextType {
  popupType: PopupType | null;
  popupData: PopupDataMap[PopupType] | null;
  openPopup: <T extends PopupType>(
    ...args: PopupDataMap[T] extends undefined ? [type: T] : [type: T, data: PopupDataMap[T]]
  ) => void;
  closePopup: () => void;
}

export const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within PopupProvider');
  }
  return context;
};
