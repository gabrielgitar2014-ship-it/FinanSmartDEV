// Mapeamento de estilos visuais para cada tipo de cartão
export const CARD_SKINS = {
  // --- NUBANK ---
  'nubank-standard': {
    id: 'nubank-standard',
    name: 'Nubank Padrão',
    bankId: 'nubank',
    bg: 'linear-gradient(135deg, #820AD1 0%, #4D047D 100%)', // Roxo clássico
    textColor: '#fff',
    logo: '/logos/nubank.png'
  },
  'nubank-ultravioleta': {
    id: 'nubank-ultravioleta',
    name: 'Ultravioleta',
    bankId: 'nubank',
    bg: 'linear-gradient(135deg, #7f0376ff 0%, #610664ff 100%)', // Metal escuro
    textColor: '#E0E0E0',
    logo: '/logos/nubank.png',
    texture: 'metal' // Flag para efeito metálico
  },

  // --- ITAÚ ---
  'itau-click': {
    id: 'itau-click',
    name: 'Itaucard Click',
    bankId: 'itau',
    bg: 'linear-gradient(135deg, #EC7000 0%, #D95B00 100%)', // Laranja
    textColor: '#fff',
    logo: '/logos/itau.png'
  },
  'itau-personnalite-black': {
    id: 'itau-personnalite-black',
    name: 'Personnalité Black',
    bankId: 'itau',
    bg: 'linear-gradient(135deg, #1C1C1C 0%, #000000 100%)', // Preto fosco
    textColor: '#D4AF37', // Dourado
    logo: '/logos/itau.png'
  },
  'itau-azul-infinite': {
    id: 'itau-azul-infinite',
    name: 'Azul Visa Infinite',
    bankId: 'itau',
    bg: 'linear-gradient(135deg, #002D72 0%, #001A4D 100%)', // Azul profundo
    textColor: '#fff',
    logo: '/logos/itau.png'
  },

  // --- BRADESCO ---
  'bradesco-elo-nanquim': {
    id: 'bradesco-elo-nanquim',
    name: 'Elo Nanquim',
    bankId: 'bradesco',
    bg: 'linear-gradient(135deg, #2C2C2C 0%, #000000 100%)',
    textColor: '#fff',
    
  },
  'bradesco-amex-platinum': {
    id: 'bradesco-amex-platinum',
    name: 'Amex Platinum',
    bankId: 'bradesco',
    bg: 'linear-gradient(135deg, #E6E6E6 0%, #B3B3B3 100%)', // Prata
    textColor: '#333',
   
  },

  // --- C6 BANK ---
  'c6-standard': {
    id: 'c6-standard',
    name: 'C6 Standard',
    bankId: 'c6',
    bg: 'linear-gradient(135deg, #242424 0%, #111 100%)',
    textColor: '#fff',
    logo: '/logos/c6.png'
  },
  'c6-carbon': {
    id: 'c6-carbon',
    name: 'C6 Carbon',
    bankId: 'c6',
    bg: 'linear-gradient(135deg, #1A1A1A 0%, #000 100%)', // Carbono
    textColor: '#C0C0C0',
    logo: '/logos/c6.png',
    texture: 'carbon'
  },

  // --- XP ---
  'xp-infinite': {
    id: 'xp-infinite',
    name: 'XP Visa Infinite',
    bankId: 'xp',
    bg: 'linear-gradient(135deg, #000000 0%, #1F1F1F 100%)',
    textColor: '#D4AF37',
    logo: '/logos/xp.png'
  },

  // --- INTER ---
  'inter-black': {
    id: 'inter-black',
    name: 'Inter Black',
    bankId: 'inter',
    bg: 'linear-gradient(135deg, #000000 0%, #222 100%)',
    textColor: '#FF7A00',
    logo: '/logos/inter.png'
  },
  'inter-gold': {
    id: 'inter-gold',
    name: 'Inter Gold',
    bankId: 'inter',
    bg: 'linear-gradient(135deg, #FF7A00 0%, #E06000 100%)',
    textColor: '#fff',
    logo: '/logos/inter.png'
  },

  // --- SANTANDER ---
  'santander-unique': {
    id: 'santander-unique',
    name: 'Santander Unique',
    bankId: 'santander',
    bg: 'linear-gradient(135deg, #1C1C1C 0%, #000 100%)',
    textColor: '#EC0000',
    logo: '/logos/santander.png'
  },
  'santander-sx': {
    id: 'santander-sx',
    name: 'Santander SX',
    bankId: 'santander',
    bg: 'linear-gradient(135deg, #EC0000 0%, #B30000 100%)',
    textColor: '#fff',
    logo: '/logos/santander.png'
  },

  // --- OUTROS (Genéricos) ---
  'default-black': { id: 'default-black', name: 'Black / Infinite', bankId: 'any', bg: '#111', textColor: '#fff' },
  'default-gold': { id: 'default-gold', name: 'Gold', bankId: 'any', bg: '#D4AF37', textColor: '#000' },
  'default-platinum': { id: 'default-platinum', name: 'Platinum', bankId: 'any', bg: '#E5E4E2', textColor: '#333' },
}

// Helper para buscar skins de um banco
export const getSkinsForBank = (bankId) => {
  const bankSpecific = Object.values(CARD_SKINS).filter(s => s.bankId === bankId)
  return bankSpecific.length > 0 ? bankSpecific : Object.values(CARD_SKINS).filter(s => s.bankId === 'any')
}