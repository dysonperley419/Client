import { useSyncExternalStore } from 'react';

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
    isBuiltin?: boolean;
    unicode?: string;
    sourceSubtext?: string;
  };
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

interface PopupState {
  popupType: PopupType | null;
  popupData: PopupDataMap[PopupType] | null;
}

const listeners = new Set<() => void>();
let state: PopupState = {
  popupType: null,
  popupData: null,
};

const getSnapshot = (): PopupState => state;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emit = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

const openPopup: PopupContextType['openPopup'] = (...args) => {
  const [type, data] = args;
  state = {
    popupType: type,
    popupData: (data ?? null) as PopupDataMap[PopupType] | null,
  };
  emit();
};

const closePopup = () => {
  state = {
    popupType: null,
    popupData: null,
  };
  emit();
};

export const usePopup = (): PopupContextType => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    popupType: snapshot.popupType,
    popupData: snapshot.popupData,
    openPopup,
    closePopup,
  };
};
