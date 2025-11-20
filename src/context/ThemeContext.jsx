import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Inicializa verificando o localStorage. Se não existir, usa 'light' conforme sua solicitação.
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('findingSmart-theme');
    return storedTheme ? storedTheme : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove a classe antiga para evitar conflitos
    root.classList.remove('light', 'dark');
    
    // Adiciona a classe atual
    root.classList.add(theme);
    
    // Persiste a escolha do usuário
    localStorage.setItem('findingSmart-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}