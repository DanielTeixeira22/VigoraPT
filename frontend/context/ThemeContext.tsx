import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorMode } from '@chakra-ui/react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [theme, setTheme] = useState<ThemeMode>(colorMode as ThemeMode);

  useEffect(() => {
    setTheme(colorMode as ThemeMode);
  }, [colorMode]);

  const toggleTheme = () => {
    toggleColorMode();
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeMode = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};
