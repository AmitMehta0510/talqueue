import { createContext, useContext } from "react";

export type DarkModeContextType = { isDark: boolean; toggle: () => void };

export const DarkModeContext = createContext<DarkModeContextType>({
  isDark: false,
  toggle: () => {},
});

/** Consume dark mode state and toggle from anywhere in the tree. */
export const useDarkMode = () => useContext(DarkModeContext);
