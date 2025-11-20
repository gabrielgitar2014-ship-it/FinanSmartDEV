import { supabase } from '../supabaseClient';

export const accountsService = {
  // Listar contas do Household atual (RLS cuida do filtro por household)
  async fetchAll() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Criar nova conta
  async create(accountData) {
    // accountData deve conter: { household_id, nome, tipo, saldo_inicial, issuer_id, cor_personalizada }
    const { data, error } = await supabase
      .from('accounts')
      .insert([accountData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar conta
  async update(id, updates) {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Excluir conta (Cuidado: verificar dependências antes, mas o banco deve barrar por FK)
  async delete(id) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};