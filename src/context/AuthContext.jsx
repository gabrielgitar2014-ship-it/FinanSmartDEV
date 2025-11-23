import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Ref para evitar race conditions no React Strict Mode
  const isFetching = useRef(false)

  // Função segura para normalizar o perfil
  // Se o banco falhar, montamos um perfil temporário com os dados do Auth
  const getProfileFromSession = (sessionUser) => {
    if (!sessionUser) return null
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: sessionUser.user_metadata?.full_name || 'Usuário',
      avatar_url: sessionUser.user_metadata?.avatar_url || null,
      onboarding_completed: false, // Padrão seguro
      // Tenta mesclar com o que já temos se existir
      ...profile 
    }
  }

  const fetchProfile = async (userId, sessionUser = null) => {
    if (isFetching.current) return
    isFetching.current = true

    console.log('[AuthContext] Buscando perfil no DB...')
    
    try {
      // Timeout de 4 segundos específico para o Banco
      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout DB')), 4000)
      )

      const { data, error } = await Promise.race([dbPromise, timeoutPromise])
      
      if (error) throw error
      
      if (data) {
        console.log('[AuthContext] Perfil carregado do DB.')
        setProfile(data)
      } else {
        console.warn('[AuthContext] Perfil não encontrado no DB. Usando metadados.')
        if (sessionUser) setProfile(getProfileFromSession(sessionUser))
      }

    } catch (error) {
      console.error('[AuthContext] Falha ao buscar perfil:', error)
      // Fallback: Usa dados da sessão para não quebrar a UI
      if (sessionUser) setProfile(getProfileFromSession(sessionUser))
    } finally {
      isFetching.current = false
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    await fetchProfile(user.id, user)
  }

  const updateProfileLocal = (newFields) => {
    setProfile(prev => ({ ...prev, ...newFields }))
  }

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            // Define um perfil provisório IMEDIATAMENTE para a UI não ficar branca
            setProfile(getProfileFromSession(session.user))
            // Busca o oficial em background
            await fetchProfile(session.user.id, session.user)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (err) {
        console.error('[AuthContext] Erro na inicialização:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // console.log(`[AuthContext] Evento: ${event}`)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Atualiza perfil imediatamente com metadados
          setProfile(prev => prev || getProfileFromSession(session.user))
          fetchProfile(session.user.id, session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile, // Agora nunca será null se o user existir
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    },
    refreshProfile,
    updateProfileLocal,
    signInWithEmail: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUpWithEmail: (email, password, fullName) => 
      supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { full_name: fullName } } 
      }),
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)