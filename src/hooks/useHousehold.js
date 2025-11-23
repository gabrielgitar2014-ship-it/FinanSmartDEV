import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useHousehold() {
  const { user } = useAuth()
  
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [myRole, setMyRole] = useState(null) // 'owner' ou 'member'
  const [loading, setLoading] = useState(true)

  const fetchHouseholdData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // 1. Descobrir qual a household do usuário e seu papel
      const { data: myLink, error: linkError } = await supabase
        .from('household_members')
        .select('role, household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (linkError || !myLink) {
        // Usuário sem família (pode acontecer se for novo ou saiu)
        setHousehold(null)
        setLoading(false)
        return
      }

      setMyRole(myLink.role)

      // 2. Buscar detalhes da Família
      const { data: house, error: houseError } = await supabase
        .from('households')
        .select('*')
        .eq('id', myLink.household_id)
        .single()
      
      if (houseError) throw houseError
      setHousehold(house)

      // 3. Buscar todos os membros (com dados do perfil)
      const { data: allMembers, error: memError } = await supabase
        .from('household_members')
        .select(`
          id, role, joined_at, status, user_id, email_invited,
          profiles ( id, full_name, email, avatar_url )
        `)
        .eq('household_id', myLink.household_id)
        .order('joined_at', { ascending: true })
      
      if (memError) throw memError
      setMembers(allMembers || [])

    } catch (err) {
      console.error('Erro ao carregar família:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchHouseholdData()
  }, [fetchHouseholdData])

  return { household, members, myRole, loading, refetch: fetchHouseholdData }
}