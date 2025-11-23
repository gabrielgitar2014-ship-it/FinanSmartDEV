// src/constants/categories.js

export const SYSTEM_CATEGORIES = [
    // DESPESAS (EXPENSE)
    { id: 'system-alimentacao', name: 'Alimentação', icon_slug: 'shopping-cart', type: 'expense', is_system_default: true },
    { id: 'system-moradia', name: 'Moradia', icon_slug: 'home', type: 'expense', is_system_default: true },
    { id: 'system-transporte', name: 'Transporte', icon_slug: 'car', type: 'expense', is_system_default: true },
    { id: 'system-lazer', name: 'Lazer', icon_slug: 'beer', type: 'expense', is_system_default: true },
    { id: 'system-saude', name: 'Saúde', icon_slug: 'activity', type: 'expense', is_system_default: true },
    { id: 'system-educacao', name: 'Educação', icon_slug: 'book', type: 'expense', is_system_default: true },
    { id: 'system-compras', name: 'Compras', icon_slug: 'bag', type: 'expense', is_system_default: true },
    { id: 'system-servicos', name: 'Serviços/Assinaturas', icon_slug: 'globe', type: 'expense', is_system_default: true },
    { id: 'system-outros-exp', name: 'Outros (Despesa)', icon_slug: 'more-horizontal', type: 'expense', is_system_default: true },

    // RECEITAS (INCOME)
    { id: 'system-salario', name: 'Salário', icon_slug: 'dollar-sign', type: 'income', is_system_default: true },
    { id: 'system-freelance', name: 'Freelance/Extra', icon_slug: 'briefcase', type: 'income', is_system_default: true },
    { id: 'system-investimentos', name: 'Investimentos', icon_slug: 'trending-up', type: 'income', is_system_default: true },
    { id: 'system-presente', name: 'Presente', icon_slug: 'gift', type: 'income', is_system_default: true },
    { id: 'system-outros-inc', name: 'Outras Receitas', icon_slug: 'plus-circle', type: 'income', is_system_default: true },
];

export const getCategoryIconBySlug = (slug) => {
    // Helper para buscar o ícone (simula o que a UI faz)
    return SYSTEM_CATEGORIES.find(c => c.icon_slug === slug)
}
