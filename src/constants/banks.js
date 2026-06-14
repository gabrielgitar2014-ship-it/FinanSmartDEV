export const BANKS = [
  // --- BANCOS TRADICIONAIS & DIGITAIS GIGANTES ---
  { id: 'nubank', name: 'Nubank', logo: '/logos/nubank.png', color: '#820AD1' },
  { id: 'itau', name: 'Itaú', logo: '/logos/itau.png', color: '#EC7000' },
  { id: 'bradesco', name: 'Bradesco', logo: '/logos/bradesco.png', color: '#CC092F' },
  { id: 'bancodobrasil', name: 'Banco do Brasil', logo: '/logos/bancodobrasil.png', color: '#F8D117', textColor: '#0038A8' },
  { id: 'santander', name: 'Santander', logo: '/logos/santander.png', color: '#EC0000' },
  { id: 'caixa', name: 'Caixa', logo: '/logos/caixa.png', color: '#005CA9' },
  { id: 'inter', name: 'Banco Inter', logo: '/logos/inter.png', color: '#FF7A00' },
  { id: 'c6', name: 'C6 Bank', logo: '/logos/c6.png', color: '#242424' },
  { id: 'btg', name: 'BTG Pactual', logo: '/logos/btg.png', color: '#003462' }, // Antes usava XP, ideal baixar logo BTG
  { id: 'xp', name: 'XP Investimentos', logo: '/logos/xp.png', color: '#000000' },
  
  // --- NOVOS BANCOS DIGITAIS (DO PDF) ---
  { id: 'pan', name: 'Banco Pan', logo: '/logos/pan.png', color: '#00A0E4' }, // Precisa Logo
  { id: 'bmg', name: 'Banco BMG', logo: '/logos/bmg.png', color: '#F58220' }, // Precisa Logo
  { id: 'sofisa', name: 'Sofisa Direto', logo: '/logos/sofisa.png', color: '#EC6608' }, // Precisa Logo
  { id: 'neon', name: 'Neon', logo: '/logos/neon.png', color: '#00FFFF', textColor: '#000' },
  { id: 'will', name: 'Will Bank', logo: '/logos/will.png', color: '#FFD700', textColor: '#000' }, // Precisa Logo
  { id: 'agibank', name: 'Agibank', logo: '/logos/agibank.png', color: '#34495E' }, // Precisa Logo
  { id: 'digio', name: 'Digio', logo: '/logos/digio.png', color: '#2D3A8C' }, // Precisa Logo
  { id: 'next', name: 'Next', logo: '/logos/next.png', color: '#00FF5F', textColor: '#000' }, // Precisa Logo
  { id: 'iti', name: 'iti Itaú', logo: '/logos/iti.png', color: '#EC008C' }, // Precisa Logo
  { id: 'superdigital', name: 'Superdigital', logo: '/logos/superdigital.png', color: '#E20613' }, // Precisa Logo

  // --- CARTEIRAS & PAGAMENTOS ---
  { id: 'picpay', name: 'PicPay', logo: '/logos/picpay.png', color: '#11C76F' },
  { id: 'mercadopago', name: 'Mercado Pago', logo: '/logos/mercadopago.png', color: '#009EE3' },
  { id: 'pagbank', name: 'PagBank', logo: '/logos/pagbank.png', color: '#00C057' }, // Precisa Logo
  { id: 'recargapay', name: 'RecargaPay', logo: '/logos/recargapay.png', color: '#3F3D56' }, // Precisa Logo
  { id: 'ame', name: 'Ame Digital', logo: '/logos/ame.png', color: '#FF007E' }, // Precisa Logo

  // --- COOPERATIVAS ---
  { id: 'sicoob', name: 'Sicoob', logo: '/logos/sicoob.png', color: '#003626' },
  { id: 'sicredi', name: 'Sicredi', logo: '/logos/sicredi.png', color: '#3EA433' },

  // --- CONTAS PJ (SE RELEVANTE) ---
  { id: 'bs2', name: 'Banco BS2', logo: '/logos/bs2.png', color: '#000000' }, // Precisa Logo
  { id: 'cora', name: 'Cora', logo: '/logos/cora.png', color: '#FE3E6D' }, // Precisa Logo
  { id: 'conta_simples', name: 'Conta Simples', logo: '/logos/contasimples.png', color: '#00D664' }, // Precisa Logo
  { id: 'linker', name: 'Linker', logo: '/logos/linker.png', color: '#000000' }, // Precisa Logo
  
  // --- GENÉRICO ---
  { id: 'money', name: 'Dinheiro / Outros', logo: null, color: '#64748b' }
]

export const getBankBySlug = (slug) => {
  return BANKS.find(b => b.id === slug) || BANKS[BANKS.length - 1]
}