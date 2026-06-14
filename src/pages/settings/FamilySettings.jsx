import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Users, Crown, Loader2, Plus, Copy, Share2, Mail, X, Clock
} from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function FamilySettings() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [isOwner, setIsOwner] = useState(false)

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [newInvite, setNewInvite] = useState({ firstName: '', lastName: '', email: '' })

  const loadFamilyData = async () => {
    try {
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('role, households(id, name)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) throw membershipError

      if (!membership) {
        setHousehold(null)
        return
      }

      setHousehold(membership.households)
      setIsOwner(membership.role === 'owner')

      const { data: memberRows, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, role, status, profiles(full_name, email, avatar_url)')
        .eq('household_id', membership.households.id)

      if (membersError) throw membersError
      setMembers(memberRows || [])

      if (membership.role === 'owner') {
        const { data: inviteRows, error: invitesError } = await supabase
          .from('household_invites')
          .select('id, token, email_invited, first_name, last_name, status, created_at')
          .eq('household_id', membership.households.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (invitesError) throw invitesError
        setInvites(inviteRows || [])
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados da família.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadFamilyData()
  }, [user])

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!household) return

    setInviteLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite', {
        body: {
          household_id: household.id,
          email: newInvite.email,
          firstName: newInvite.firstName,
          lastName: newInvite.lastName,
        }
      })
      if (error) throw error

      setInvites(prev => [{
        id: Date.now(),
        token: data.token,
        email_invited: newInvite.email,
        first_name: newInvite.firstName,
        last_name: newInvite.lastName,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, ...prev])

      setNewInvite({ firstName: '', lastName: '', email: '' })
      setShowInviteForm(false)
      toast.success('Convite criado!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao criar convite.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleShareInvite = async (invite) => {
    const link = `${window.location.origin}/invite?token=${invite.token}`
    if (navigator.share) {
      navigator.share({ title: 'Convite FinanSmart', text: `Olá ${invite.first_name || ''}, entre na nossa família no FinanSmart!`, url: link })
    } else {
      navigator.clipboard.writeText(link)
      toast.success('Link copiado!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    )
  }

  return (
    <div className="pb-32 lg:pb-0 bg-slate-50 dark:bg-slate-950 min-h-screen relative animate-in slide-in-from-right-10 duration-300">

      {/* CAPA DE FUNDO */}
      <div className="h-48 bg-gradient-to-r from-indigo-600 to-violet-600 w-full absolute top-0 left-0 z-0"></div>

      {/* HEADER */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-lg font-bold text-white">Minha Família</h1>
        <div className="w-10" />
      </div>

      {/* CONTEÚDO */}
      <div className="relative z-10 px-4 -mt-4 pb-10 space-y-6">

        {!household ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl text-center border border-slate-100 dark:border-slate-800">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 text-sm">Você ainda não faz parte de uma família.</p>
          </div>
        ) : (
          <>
            {/* CARD PRINCIPAL */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 -mt-12 mb-3 shadow-lg border-4 border-white dark:border-slate-900">
                <Users size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{household.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{members.length} {members.length === 1 ? 'membro' : 'membros'}</p>
            </div>

            {/* LISTA DE MEMBROS */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-2">
                <Users size={14} /> Membros
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-slate-400 font-bold">
                        {member.profiles?.avatar_url ? (
                          <img src={member.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          member.profiles?.full_name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {member.profiles?.full_name || member.profiles?.email}
                          {member.user_id === user.id && <span className="text-slate-400 font-normal"> (você)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{member.profiles?.email}</p>
                      </div>
                    </div>
                    {member.role === 'owner' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                        <Crown size={12} /> Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* CONVITES (apenas owner) */}
            {isOwner && (
              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-2">
                    <Mail size={14} /> Convites
                  </h3>
                  <button
                    onClick={() => setShowInviteForm(v => !v)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    {showInviteForm ? <X size={14} /> : <Plus size={14} />}
                    {showInviteForm ? 'Cancelar' : 'Convidar'}
                  </button>
                </div>

                {showInviteForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handleSendInvite}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <input
                        value={newInvite.firstName}
                        onChange={e => setNewInvite(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Nome"
                        className="w-full bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        value={newInvite.lastName}
                        onChange={e => setNewInvite(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Sobrenome"
                        className="w-full bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <input
                      type="email"
                      required
                      value={newInvite.email}
                      onChange={e => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="E-mail"
                      className="w-full bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {inviteLoading ? <Loader2 className="animate-spin" size={16} /> : 'Gerar convite'}
                    </button>
                  </motion.form>
                )}

                {invites.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {[invite.first_name, invite.last_name].filter(Boolean).join(' ') || invite.email_invited}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={11} /> Pendente · código {invite.token}
                          </p>
                        </div>
                        <button
                          onClick={() => handleShareInvite(invite)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                          title="Compartilhar convite"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
