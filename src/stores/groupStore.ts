import { create } from 'zustand';
import type { Group } from '@/types/groupTypes';

interface GroupState {
  groups: Group[];
  isLoading: boolean;
}

interface GroupActions {
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setLoading: (isLoading: boolean) => void;
}

type GroupStore = GroupState & GroupActions;

export const useGroupStore = create<GroupStore>()((set) => ({
  groups: [],
  isLoading: false,

  setGroups: (groups) => set({ groups }),

  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),

  removeGroup: (groupId) =>
    set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) })),

  setLoading: (isLoading) => set({ isLoading }),
}));
