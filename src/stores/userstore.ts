import { create } from 'zustand';

import type { Presence } from '@/types/presences';
import type { User } from '@/types/users';

export type UserWithPresence = User & { presence?: Presence };

export interface UserStore {
  users: Record<string, UserWithPresence>;
  upsertUsers: (newUsers: User[]) => void;
  updatePresence: (userId: string, newPresence: Presence) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  users: {},
  upsertUsers: (newUsers) => {
    set((state) => {
      const nextUsers = { ...state.users };

      newUsers.forEach((user) => {
        nextUsers[user.id] = {
          ...nextUsers[user.id],
          ...user,
        } as UserWithPresence;
      });

      return { users: nextUsers };
    });
  },
  updatePresence: (userId, newPresence) => {
    set((state) => {
      const existingUser = state.users[userId];

      if (!existingUser) {
        return {
          users: {
            ...state.users,
            [userId]: { id: userId, presence: newPresence } as UserWithPresence,
          },
        };
      }

      return {
        users: {
          ...state.users,
          [userId]: {
            ...existingUser,
            presence: newPresence,
          },
        },
      };
    });
  },
}));
