import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const LanguageContext = createContext({})

export const LanguageProvider = ({ children }) => {
  const { profile } = useAuth()
  // Padrão pt-BR, mas tenta pegar do perfil ou localStorage
  const [language, setLanguage] = useState('pt-BR')

  // Sincroniza com o perfil do usuário sempre que carregar
  useEffect(() => {
    if (profile?.language) {
      setLanguage(profile.language)
    }
  }, [profile])

  // Função para trocar idioma (salva localmente para resposta imediata)
  const changeLanguage = (lang) => {
    setLanguage(lang)
    // Aqui futuramente você pode carregar arquivos de tradução JSON
  }

  // Dicionário Simples para teste (Pode expandir depois)
  const t = (key) => {
    const dictionary = {
      'settings': { 'pt-BR': 'Ajustes', 'en-US': 'Settings' },
      'profile': { 'pt-BR': 'Perfil', 'en-US': 'Profile' },
      // Adicione mais chaves conforme necessário
    }
    return dictionary[key]?.[language] || key
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)