import { create } from 'zustand';

interface UIState {
    isFilterDrawerOpen: boolean;
    toggleFilterDrawer: () => void;
    setFilterDrawerOpen: (open: boolean) => void;
    isSearchOpen: boolean;
    toggleSearch: () => void;
    setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isFilterDrawerOpen: false,
    toggleFilterDrawer: () => set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),
    setFilterDrawerOpen: (open) => set({ isFilterDrawerOpen: open }),
    isSearchOpen: false,
    toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
    setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
