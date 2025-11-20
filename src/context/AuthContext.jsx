import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // === 1. BUSCA DE DADOS BLINDADA ===
  const fetchUserData = useCallback(async (currentUser) => {
    if (!currentUser) {
      console.log('AuthContext: Nenhum usuário para buscar dados.');
      return;
    }
    
    console.log('AuthContext: Buscando dados para user ID:', currentUser.id);

    try {
      // A) Busca o Perfil
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      // LOG DE PERFIL
      if (profileError) console.warn('AuthContext: Erro ao buscar perfil:', profileError.message);
      else console.log('AuthContext: Perfil encontrado:', profileData);

      // --- LÓGICA DE AUTO-CORREÇÃO ---
      if (profileError && profileError.code === 'PGRST116') {
         console.warn("AuthContext: Perfil não existe. Tentando Self-Healing...");
         
         const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
                id: currentUser.id, 
                email: currentUser.email,
                first_name: currentUser.user_metadata?.first_name || 'Usuário',
                last_name: currentUser.user_metadata?.last_name || ''
            }])
            .select()
            .single();
            
         if (!createError) {
            console.log('AuthContext: Self-Healing com sucesso!', newProfile);
            profileData = newProfile;
         } else {
            console.error("AuthContext: Falha crítica no Self-Healing:", createError);
         }
      }
      
      if (profileData) {
        setProfile(profileData);
      }

      // B) Busca a Role
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
      
      if (roleError) {
        console.warn('AuthContext: Erro ao buscar role:', roleError.message);
        setRole(null);
      } else {
        console.log('AuthContext: Role definida como:', roleData);
        setRole(roleData); 
      }

    } catch (err) {
      console.error('AuthContext: Erro fatal (Catch):', err);
    }
  }, []);

  // === 2. INICIALIZAÇÃO ===
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      console.log('AuthContext: Inicializando sessão...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthContext: Sessão existente encontrada para:', session.user.email);
          setUser(session.user);
          await fetchUserData(session.user);
        } else {
          console.log('AuthContext: Nenhuma sessão ativa.');
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("AuthContext: Erro no initSession:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // Escuta mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthContext: Evento de Auth disparado: ${event}`);
      
      if (session?.user) {
        setUser(session.user);
        
        if (!profile || profile.id !== session.user.id) {
            console.log('AuthContext: Usuário mudou ou perfil vazio. Recarregando dados...');
            await fetchUserData(session.user);
        }
      } else {
        console.log('AuthContext: Usuário deslogado.');
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, profile]);

  // === 3. AÇÕES ===
  const signIn = async (email, password) => {
    console.log('AuthContext: Tentando login para:', email);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) console.error('AuthContext: Erro no Login:', result.error.message);
    else console.log('AuthContext: Login bem sucedido (Supabase response ok)');
    return result;
  };

  const signUp = async (email, password, metaData) => {
    console.log('AuthContext: Tentando cadastro com meta:', metaData);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: metaData }
    });
    return result;
  };

  const signOut = async () => {
    console.log('AuthContext: Fazendo Logout...');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    console.log('AuthContext: Refresh manual solicitado.');
    if (user) {
      await fetchUserData(user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, role, loading, 
      signIn, signUp, signOut, refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);