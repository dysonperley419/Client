import { createContext, useContext } from 'react';

import type { ImagePreviewProps } from '@/components/modals/imagePreview';
import type { Channel } from '@/types/channel';
import type { Guild, Member } from '@/types/guilds';
import type { User } from '@/types/users';

export interface ModalDataMap {
  JOIN_SERVER: undefined;
  CREATE_SERVER: undefined;
  WHATS_IT_GONNA_BE: undefined;
  CONFIRMATION_LEAVE: { name: string; id: string; type: string };
  CLEAR_SELECTED_INSTANCE: undefined;
  CONFIRMATION_DELETE: { id: string; type: string };
  DANGER_CONFIRMATION: { title: string; body: string; onCancel: () => void; onConfirm: () => void };
  CONFIRMATION_CONNECT_P2P: {
    channel: Channel;
    name: string;
    guild_id?: string | null;
  };
  SERVER_PROFILE: {
    member: Member;
    mutual_guilds?: Guild[] | [];
    mutual_friends?: User[] | [];
    connected_accounts?: any[] | [];
    premium_since?: string | null;
    premium_type?: number;
  };
  IMAGE_PREVIEW: ImagePreviewProps;
}

export type ModalType = keyof ModalDataMap;

interface ModalContextType {
  modalType: ModalType | null;
  modalData: ModalDataMap[ModalType] | null;
  openModal: <T extends ModalType>(
    ...args: ModalDataMap[T] extends undefined ? [type: T] : [type: T, data: ModalDataMap[T]]
  ) => void;
  updateModal: <T extends ModalType>(data: Partial<ModalDataMap[T]>) => void;
  closeModal: () => void;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};
