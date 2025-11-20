import { supabase } from '../supabaseClient';

export const transactionsService = {
  // Buscar transações com filtros (Mês/Ano são cruciais)
  async fetchByMonth(month, year, filters = {}) {
    // Calcular intervalo de datas
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories (
          id, nome, icon_name, color_hex
        ),
        payment_methods (
          id, nome_conta, tipo
        ),
        profiles:user_id (
          nome_completo, avatar_url
        )
      `)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: false });

    // Filtros opcionais
    if (filters.tipo) {
      query = query.eq('tipo', filters.tipo); // 'income' | 'expense'
    }
    
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(transactionData) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};