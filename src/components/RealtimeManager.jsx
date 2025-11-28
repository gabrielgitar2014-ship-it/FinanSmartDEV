import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useSyncStore } from '../store/useSyncStore'
import { useAuth } from '../context/AuthContext'

export default function RealtimeManager() {
  const { user } = useAuth()
  const triggerSync = useSyncStore((state) => state.triggerSync)

  useEffect(() => {
    if (!user) return

    console.log('[RealtimeManager] Conectando aos canais...')

    // Cria um canal único para escutar tudo o que importa
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'transactions' // Escuta Transações
        },
        (payload) => {
          console.log('[Realtime] Mudança em Transações detectada:', payload)
          triggerSync()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts' // Escuta Contas (Saldo mudou?)
        },
        (payload) => {
          console.log('[Realtime] Mudança em Contas detectada:', payload)
          triggerSync()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeManager] Escutando alterações em tempo real.')
        }
      })

    // Cleanup: Desconecta ao sair (logout/fechar)
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, triggerSync])

  return null // Componente invisível
}