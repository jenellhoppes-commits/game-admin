import type {
  AgentRecord,
  AgentStatus,
  BusinessRecord,
  BusinessStatus,
  GameRecord,
  GameTaxonomyRecord,
  MerchantLine,
  MerchantRecord
} from '@/types/game-provider'

const statuses: BusinessStatus[] = [
  'Active',
  'Active',
  'Active',
  'Pending',
  'Maintenance',
  'Inactive',
  'Draft',
  'Published',
  'Risk',
  'Disabled'
]

export const agentMockData: AgentRecord[] = [
  ['A00001', 'AG-TW-001', '亞洲總代理', 'L1', '—', 18, 'TWD', 'Ethan Lin'],
  ['A00002', 'AG-PH-002', 'Pacific Link', 'L2', '亞洲總代理', 12, 'USD', 'Maria Santos'],
  ['A00003', 'AG-TH-003', 'Siam Crown', 'L2', '亞洲總代理', 9, 'THB', 'Narin Chai'],
  ['A00004', 'AG-JP-004', 'Mirai Network', 'L3', 'Pacific Link', 6, 'JPY', 'Aiko Mori'],
  ['A00005', 'AG-VN-005', 'Lotus Seven', 'L2', '亞洲總代理', 11, 'VND', 'Minh Tran'],
  ['A00006', 'AG-ID-006', 'Garuda Digital', 'L3', 'Pacific Link', 5, 'IDR', 'Rizky Putra'],
  ['A00007', 'AG-MY-007', 'Straits Gaming', 'L2', '亞洲總代理', 8, 'MYR', 'Amir Rahman'],
  ['A00008', 'AG-KR-008', 'Han River', 'L3', 'Siam Crown', 4, 'KRW', 'Ji-ho Park'],
  ['A00009', 'AG-HK-009', 'Victoria Group', 'L2', '亞洲總代理', 7, 'HKD', 'Chloe Wong'],
  ['A00010', 'AG-SG-010', '全球策略代理', 'L1', '—', 15, 'SGD', 'Noah Tan'],
  ['A00011', 'AG-MO-011', 'Harbour Matrix', 'L3', 'Victoria Group', 3, 'HKD', 'Leo Chan'],
  ['A00012', 'AG-KH-012', 'Mekong Star', 'L3', 'Lotus Seven', 5, 'USD', 'Sok Dara'],
  ['A00013', 'AG-IN-013', 'Indus Play', 'L2', '全球策略代理', 10, 'INR', 'Arjun Mehta'],
  ['A00014', 'AG-AU-014', 'Southern Cross', 'L2', '全球策略代理', 8, 'AUD', 'Olivia Reed'],
  ['A00015', 'AG-EU-015', '歐洲總代理', 'L1', '—', 14, 'EUR', 'Emil Larsen']
].map((row, index) => ({
  id: row[0] as string,
  code: row[1] as string,
  name: row[2] as string,
  level: row[3] as AgentRecord['level'],
  parentAgent: row[4] as string,
  childAgentCount: row[3] === 'L1' ? 4 + (index % 3) : row[3] === 'L2' ? 2 + (index % 2) : 0,
  merchantCount: row[5] as number,
  currency: row[6] as string,
  contact: row[7] as string,
  contactMethod: `ops${index + 1}@agent.example`,
  cooperationStartDate: `2026-${String((index % 6) + 1).padStart(2, '0')}-01`,
  note: index % 3 === 0 ? '區域重點合作代理' : '',
  status: ['Active', 'Active', 'Active', 'Pending', 'Active', 'Disabled', 'Draft'][
    index % 7
  ] as AgentStatus,
  createdAt: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index % 24) + 1).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:30`,
  updatedAt: `2026-09-${String((index % 2) + 1).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:20`
}))

const buildRecords = (
  prefix: string,
  names: string[],
  categories: string[],
  owners: string[],
  metrics: string[]
): BusinessRecord[] =>
  names.map((name, index) => ({
    id: `${prefix}${String(index + 1).padStart(5, '0')}`,
    code: `${prefix}-${String(index + 1).padStart(4, '0')}`,
    name,
    category: categories[index % categories.length],
    owner: owners[index % owners.length],
    metric: metrics[index % metrics.length],
    status: statuses[index % statuses.length],
    updatedAt: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index % 26) + 1).padStart(2, '0')} ${String(8 + (index % 10)).padStart(2, '0')}:20`
  }))

const merchantSeeds = [
  ['NovaBet', 'A00001', '亞洲總代理', 'Seamless', 'Taiwan', 'Asia/Taipei', 'Olivia Chen'],
  ['Astra88', 'A00002', 'Pacific Link', 'Transfer', 'Philippines', 'Asia/Manila', 'Marco Lee'],
  ['Orion Play', 'A00003', 'Siam Crown', 'Seamless', 'Thailand', 'Asia/Bangkok', 'Pim Anan'],
  [
    'Lucky Harbor',
    'A00009',
    'Victoria Group',
    'Transfer',
    'Hong Kong',
    'Asia/Hong_Kong',
    'Kelly Wong'
  ],
  ['Vega Club', 'A00005', 'Lotus Seven', 'Seamless', 'Vietnam', 'Asia/Ho_Chi_Minh', 'Linh Nguyen'],
  ['Golden Reel', 'A00010', '全球策略代理', 'Seamless', 'Singapore', 'Asia/Singapore', 'Evan Tan'],
  [
    'Moonlight',
    'A00007',
    'Straits Gaming',
    'Transfer',
    'Malaysia',
    'Asia/Kuala_Lumpur',
    'Aina Noor'
  ],
  [
    'Royal Spin',
    'A00014',
    'Southern Cross',
    'Seamless',
    'Australia',
    'Australia/Sydney',
    'Mia Hall'
  ],
  ['BetWorks', 'A00013', 'Indus Play', 'Transfer', 'India', 'Asia/Kolkata', 'Aarav Shah'],
  ['Titan Arena', 'A00015', '歐洲總代理', 'Seamless', 'Malta', 'Europe/Malta', 'Luca Grech'],
  ['Mango Play', 'A00012', 'Mekong Star', 'Seamless', 'Cambodia', 'Asia/Phnom_Penh', 'Sokha Lim'],
  ['Cloud Nine', 'A00004', 'Mirai Network', 'Transfer', 'Japan', 'Asia/Tokyo', 'Ren Ito']
] as const

const currencySets = [
  ['USD', 'TWD'],
  ['USD', 'PHP'],
  ['THB', 'USD'],
  ['HKD', 'USD'],
  ['VND', 'USD'],
  ['SGD', 'USD'],
  ['MYR', 'USD'],
  ['AUD', 'USD'],
  ['INR', 'USD'],
  ['EUR', 'USD'],
  ['USD'],
  ['JPY', 'USD']
]

export const merchantRecords: MerchantRecord[] = merchantSeeds.map((seed, index) => {
  const id = `M${String(index + 1).padStart(5, '0')}`
  const merchantCode = `MER-${String(index + 1).padStart(4, '0')}`
  const walletMode = seed[3]
  const lines: MerchantLine[] = currencySets[index].map((currency, currencyIndex) => {
    const lineUid = `ASG_${merchantCode.replaceAll('-', '')}_${currency}`
    const hasProduction = index % 4 !== 0
    const issuedSuffix = `${String(index + 1).padStart(2, '0')}${String(currencyIndex + 1).padStart(2, '0')}`
    return {
      uid: lineUid,
      merchantId: id,
      currency,
      walletMode,
      enabledGames: 18 + ((index + currencyIndex) % 5) * 6,
      limitPlanCount: 3 + ((index + currencyIndex) % 4),
      jackpotMode: ['Default', 'Custom', 'Excluded'][(index + currencyIndex) % 3] as
        | 'Default'
        | 'Custom'
        | 'Excluded',
      environment: hasProduction ? 'Production' : 'Sandbox',
      credentialStatus: hasProduction ? 'Active' : 'Testing',
      environments: [
        {
          id: `${lineUid}-SBX`,
          environment: 'Sandbox',
          endpoint: 'https://sandbox-api.game-provider.local/v2',
          callbackUrl: `https://${seed[0].toLowerCase().replaceAll(' ', '-')}.example.com/game/callback`,
          ipWhitelist: ['203.0.113.0/24', '198.51.100.18'],
          status: hasProduction ? 'Active' : 'Testing',
          credential: {
            id: `CR-SBX-${issuedSuffix}`,
            environment: 'Sandbox',
            apiKey: `sbx_gp_${lineUid.toLowerCase()}`,
            fingerprint: `SBX:${issuedSuffix}:8F:2A`,
            apiVersion: 'v2.0',
            signatureVersion: 'HMAC-SHA256',
            status: hasProduction ? 'Active' : 'Testing',
            issuedAt: '2026-08-20 11:30',
            expiresAt: '2027-08-20 11:30'
          },
          updatedAt: '2026-08-28 16:20'
        },
        ...(hasProduction
          ? [
              {
                id: `${lineUid}-PRD`,
                environment: 'Production' as const,
                endpoint: 'https://api.game-provider.local/v2',
                callbackUrl: `https://${seed[0].toLowerCase().replaceAll(' ', '-')}.example.com/game/callback`,
                ipWhitelist: ['203.0.113.0/24'],
                status: 'Active' as const,
                credential: {
                  id: `CR-PRD-${issuedSuffix}`,
                  environment: 'Production' as const,
                  apiKey: `prd_gp_${lineUid.toLowerCase()}`,
                  fingerprint: `PRD:${issuedSuffix}:6C:91`,
                  apiVersion: 'v2.0',
                  signatureVersion: 'HMAC-SHA256',
                  status: 'Active' as const,
                  issuedAt: '2026-08-26 10:00',
                  expiresAt: '2027-08-26 10:00'
                },
                updatedAt: '2026-08-29 09:45'
              }
            ]
          : [])
      ],
      status: hasProduction ? 'Active' : 'Testing',
      updatedAt: `2026-08-${String(18 + (index % 12)).padStart(2, '0')} 14:20`
    }
  })

  return {
    id,
    code: merchantCode,
    name: seed[0],
    agentId: seed[1],
    agentName: seed[2],
    walletMode,
    country: seed[4],
    timezone: seed[5],
    contact: seed[6],
    agentTermPercent: 96 + (index % 3) * 0.5,
    merchantTermPercent: 90.5 + (index % 4) * 0.5,
    settlementCurrency: index % 3 === 0 ? 'TWD' : 'USD',
    settlementCycle: index % 2 === 0 ? 'Monthly' : 'Weekly',
    status: index % 5 === 4 ? 'Pending' : 'Active',
    lines,
    createdAt: `2026-${String((index % 7) + 1).padStart(2, '0')}-${String(index + 3).padStart(2, '0')} 10:00`,
    updatedAt: `2026-08-${String(20 + (index % 10)).padStart(2, '0')} 16:30`
  }
})

export const merchantMockData: BusinessRecord[] = merchantRecords.map((merchant) => ({
  id: merchant.id,
  code: merchant.code,
  name: merchant.name,
  category: merchant.walletMode,
  owner: merchant.agentName,
  metric: `${merchant.lines.length} 條線路`,
  status: merchant.status,
  updatedAt: merchant.updatedAt
}))

const gameTypeNames: Record<string, string> = {
  GT001: '電子遊戲',
  GT002: '真人遊戲',
  GT003: '捕魚遊戲',
  GT004: '街機遊戲',
  GT005: '桌牌遊戲',
  GT006: '虛擬運動',
  GT007: '彩票遊戲',
  GT008: '其他遊戲'
}

export const gameRecords: GameRecord[] = [
  {
    id: 'G00001',
    code: 'DRAGON_VAULT',
    icon: '🐉',
    internalName: 'Dragon Vault',
    displayName: '龍之寶庫',
    englishName: 'Dragon Vault',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT001', 'FT004', 'FT006'],
    marketingTagIds: ['MT001', 'MT002'],
    defaultRtp: 96.5,
    rtpPlanCount: 3,
    limitPlanCount: 6,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 42,
    status: 'Active',
    updatedAt: '2026-09-01 16:20'
  },
  {
    id: 'G00002',
    code: 'NEON_TIGER',
    icon: '🐯',
    internalName: 'Neon Tiger',
    displayName: '霓虹虎',
    englishName: 'Neon Tiger',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT001', 'FT002', 'FT004'],
    marketingTagIds: ['MT001', 'MT003'],
    defaultRtp: 96.2,
    rtpPlanCount: 2,
    limitPlanCount: 5,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 35,
    status: 'Active',
    updatedAt: '2026-09-01 11:45'
  },
  {
    id: 'G00003',
    code: 'LUCKY_PANDA',
    icon: '🐼',
    internalName: 'Lucky Panda',
    displayName: '幸運熊貓',
    englishName: 'Lucky Panda',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT004', 'FT005'],
    marketingTagIds: ['MT003'],
    rtpPlanCount: 0,
    limitPlanCount: 0,
    rtpStatus: 'Not Configured',
    limitStatus: 'Not Configured',
    masterComplete: true,
    merchantCount: 0,
    status: 'Draft',
    updatedAt: '2026-08-31 17:30'
  },
  {
    id: 'G00004',
    code: 'CYBER_KOI',
    icon: '🐟',
    internalName: 'Cyber Koi',
    displayName: '賽博錦鯉',
    englishName: 'Cyber Koi',
    typeId: 'GT003',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT003', 'FT006'],
    marketingTagIds: ['MT002'],
    defaultRtp: 95.8,
    rtpPlanCount: 2,
    limitPlanCount: 8,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 18,
    status: 'Maintenance',
    updatedAt: '2026-08-31 14:10'
  },
  {
    id: 'G00005',
    code: 'PHARAOH_LINK',
    icon: '👑',
    internalName: 'Pharaoh Link',
    displayName: '法老連線',
    englishName: 'Pharaoh Link',
    typeId: 'GT001',
    defaultLocale: 'en-US',
    featureTagIds: ['FT003', 'FT004'],
    marketingTagIds: ['MT003', 'MT005'],
    rtpPlanCount: 0,
    limitPlanCount: 4,
    rtpStatus: 'Not Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 0,
    status: 'Draft',
    updatedAt: '2026-08-30 18:05'
  },
  {
    id: 'G00006',
    code: 'OCEAN_RICHES',
    icon: '🌊',
    internalName: 'Ocean Riches',
    displayName: '海洋財富',
    englishName: 'Ocean Riches',
    typeId: 'GT003',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT003', 'FT005'],
    marketingTagIds: ['MT001'],
    defaultRtp: 96.8,
    rtpPlanCount: 3,
    limitPlanCount: 10,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 31,
    status: 'Active',
    updatedAt: '2026-08-30 12:40'
  },
  {
    id: 'G00007',
    code: 'TEMPLE_RUNES',
    icon: '🏛️',
    internalName: 'Temple Runes',
    displayName: '神殿符文',
    englishName: 'Temple Runes',
    typeId: 'GT001',
    defaultLocale: 'en-US',
    featureTagIds: ['FT005', 'FT008'],
    marketingTagIds: ['MT006'],
    defaultRtp: 95.5,
    rtpPlanCount: 2,
    limitPlanCount: 4,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 12,
    status: 'Disabled',
    updatedAt: '2026-08-29 15:25'
  },
  {
    id: 'G00008',
    code: 'FORTUNE_OX',
    icon: '🐂',
    internalName: 'Fortune Ox',
    displayName: '財富金牛',
    englishName: 'Fortune Ox',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT001', 'FT006'],
    marketingTagIds: ['MT002', 'MT003'],
    defaultRtp: 96.0,
    rtpPlanCount: 2,
    limitPlanCount: 0,
    rtpStatus: 'Configured',
    limitStatus: 'Not Configured',
    masterComplete: true,
    merchantCount: 0,
    status: 'Draft',
    updatedAt: '2026-08-29 10:15'
  },
  {
    id: 'G00009',
    code: 'GALAXY_GEMS',
    icon: '💎',
    internalName: 'Galaxy Gems',
    displayName: '銀河寶石',
    englishName: 'Galaxy Gems',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT001', 'FT007', 'FT008'],
    marketingTagIds: ['MT001', 'MT007'],
    defaultRtp: 97.1,
    rtpPlanCount: 4,
    limitPlanCount: 5,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 48,
    status: 'Active',
    updatedAt: '2026-08-28 19:20'
  },
  {
    id: 'G00010',
    code: 'ROYAL_BACCARAT',
    icon: '🃏',
    internalName: 'Royal Baccarat',
    displayName: '皇家百家樂',
    englishName: 'Royal Baccarat',
    typeId: 'GT002',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT009'],
    marketingTagIds: ['MT001', 'MT006'],
    defaultRtp: 98.9,
    rtpPlanCount: 1,
    limitPlanCount: 12,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 52,
    status: 'Active',
    updatedAt: '2026-08-28 16:50'
  },
  {
    id: 'G00011',
    code: 'MYSTIC_WHEEL',
    icon: '🎡',
    internalName: 'Mystic Wheel',
    displayName: '神秘轉輪',
    englishName: 'Mystic Wheel',
    typeId: 'GT004',
    defaultLocale: 'zh-TW',
    featureTagIds: [],
    marketingTagIds: [],
    rtpPlanCount: 0,
    limitPlanCount: 0,
    rtpStatus: 'Not Configured',
    limitStatus: 'Not Configured',
    masterComplete: false,
    merchantCount: 0,
    status: 'Draft',
    updatedAt: '2026-08-27 13:30'
  },
  {
    id: 'G00012',
    code: 'GOLDEN_PHOENIX',
    icon: '🔥',
    internalName: 'Golden Phoenix',
    displayName: '黃金鳳凰',
    englishName: 'Golden Phoenix',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT002', 'FT003', 'FT004'],
    marketingTagIds: ['MT001', 'MT002'],
    defaultRtp: 96.5,
    rtpPlanCount: 3,
    limitPlanCount: 6,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 39,
    status: 'Active',
    updatedAt: '2026-08-27 09:45'
  },
  {
    id: 'G00013',
    code: 'JUNGLE_KING',
    icon: '🦁',
    internalName: 'Jungle King',
    displayName: '叢林之王',
    englishName: 'Jungle King',
    typeId: 'GT001',
    defaultLocale: 'en-US',
    featureTagIds: ['FT004', 'FT005'],
    marketingTagIds: ['MT006'],
    defaultRtp: 96.1,
    rtpPlanCount: 2,
    limitPlanCount: 4,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 21,
    status: 'Maintenance',
    updatedAt: '2026-08-26 17:10'
  },
  {
    id: 'G00014',
    code: 'CANDY_BURST',
    icon: '🍬',
    internalName: 'Candy Burst',
    displayName: '糖果爆發',
    englishName: 'Candy Burst',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT008'],
    marketingTagIds: ['MT003', 'MT007'],
    defaultRtp: 96.3,
    rtpPlanCount: 1,
    limitPlanCount: 0,
    rtpStatus: 'Configured',
    limitStatus: 'Not Configured',
    masterComplete: true,
    merchantCount: 0,
    status: 'Draft',
    updatedAt: '2026-08-26 11:00'
  },
  {
    id: 'G00015',
    code: 'MOON_RABBIT',
    icon: '🐇',
    internalName: 'Moon Rabbit',
    displayName: '月光兔',
    englishName: 'Moon Rabbit',
    typeId: 'GT001',
    defaultLocale: 'zh-TW',
    featureTagIds: ['FT004', 'FT007'],
    marketingTagIds: ['MT005'],
    defaultRtp: 95.9,
    rtpPlanCount: 2,
    limitPlanCount: 3,
    rtpStatus: 'Configured',
    limitStatus: 'Configured',
    masterComplete: true,
    merchantCount: 7,
    status: 'Disabled',
    updatedAt: '2026-08-25 15:35'
  }
]

export const gameMockData: BusinessRecord[] = gameRecords.map((game) => ({
  id: game.id,
  code: game.code,
  name: game.displayName,
  category: gameTypeNames[game.typeId] || '未分類',
  owner: game.internalName,
  metric: game.defaultRtp ? `RTP ${game.defaultRtp}%` : 'RTP 未設定',
  status: game.status,
  updatedAt: game.updatedAt
}))

export const gameTypeMockData: GameTaxonomyRecord[] = [
  ['GT001', 'SLOT', '電子遊戲', 'Slot Bet Levels', 86, 10, 'Active', '主要電子拉霸遊戲'],
  ['GT002', 'LIVE', '真人遊戲', 'Generic Bet Range', 18, 20, 'Active', '真人桌檯遊戲'],
  ['GT003', 'FISH', '捕魚遊戲', 'Fishing Hall BetX', 12, 30, 'Active', '依廳別與 Bet X 設定限紅'],
  ['GT004', 'ARCADE', '街機遊戲', 'Arcade Level Currency', 9, 40, 'Active', '依 Level 與幣別設定'],
  ['GT005', 'TABLE', '桌牌遊戲', 'Generic Bet Range', 21, 50, 'Active', '一般桌牌遊戲'],
  ['GT006', 'SPORT', '虛擬運動', 'Generic Bet Range', 6, 60, 'Active', '虛擬賽事內容'],
  ['GT007', 'LOTTERY', '彩票遊戲', 'Generic Bet Range', 4, 70, 'Active', '數字與即開彩票'],
  ['GT008', 'OTHER', '其他遊戲', 'Generic Bet Range', 0, 99, 'Disabled', '尚未歸類的遊戲']
].map(([id, code, name, limitModel, gameCount, sort, status, note], index) => ({
  id: String(id),
  kind: 'type',
  code: String(code),
  name: String(name),
  limitModel: limitModel as GameTaxonomyRecord['limitModel'],
  gameCount: Number(gameCount),
  sort: Number(sort),
  status: status as GameTaxonomyRecord['status'],
  note: String(note),
  updatedAt: `2026-08-${String(30 - index).padStart(2, '0')} 14:20`
}))

export const gameFeatureTagMockData: GameTaxonomyRecord[] = [
  ['FT001', 'BUY_FEATURE', '購買特色', true, 'Buy Feature 投注上限', 42, 10, 'Active'],
  ['FT002', 'SUPER_BUY', '超級購買', true, 'Super Buy 投注上限', 18, 20, 'Active'],
  ['FT003', 'JACKPOT', '支援獎池', true, 'Jackpot 參與設定', 33, 30, 'Active'],
  ['FT004', 'FREE_GAME', '免費遊戲', false, '', 78, 40, 'Active'],
  ['FT005', 'BONUS_GAME', '獎勵遊戲', false, '', 51, 50, 'Active'],
  ['FT006', 'MULTIPLIER', '倍數機制', false, '', 64, 60, 'Active'],
  ['FT007', 'RESPIN', '重新轉動', false, '', 27, 70, 'Active'],
  ['FT008', 'CASCADE', '連鎖消除', false, '', 22, 80, 'Active'],
  ['FT009', 'MULTI_HAND', '多手玩法', true, '玩法限紅設定', 8, 90, 'Active'],
  ['FT010', 'LEGACY_BONUS', '舊版獎勵', false, '', 0, 100, 'Disabled']
].map(([id, code, name, affectsSettings, relatedSetting, gameCount, sort, status], index) => ({
  id: String(id),
  kind: 'feature',
  code: String(code),
  name: String(name),
  affectsSettings: Boolean(affectsSettings),
  relatedSetting: String(relatedSetting),
  gameCount: Number(gameCount),
  sort: Number(sort),
  status: status as GameTaxonomyRecord['status'],
  updatedAt: `2026-08-${String(29 - index).padStart(2, '0')} 11:40`
}))

export const gameMarketingTagMockData: GameTaxonomyRecord[] = [
  ['MT001', '熱門遊戲', '熱門', 36, 10, 'Active'],
  ['MT002', '推薦遊戲', '推薦', 24, 20, 'Active'],
  ['MT003', '新遊戲', 'NEW', 15, 30, 'Active'],
  ['MT004', '高人氣', '人氣榜', 18, 40, 'Active'],
  ['MT005', '節慶活動', '節慶限定', 8, 50, 'Active'],
  ['MT006', '經典遊戲', '經典', 29, 60, 'Active'],
  ['MT007', '行動裝置推薦', '手機推薦', 41, 70, 'Active'],
  ['MT008', '舊版活動', '活動結束', 0, 99, 'Disabled']
].map(([id, name, displayText, gameCount, sort, status], index) => ({
  id: String(id),
  kind: 'marketing',
  name: String(name),
  displayText: String(displayText),
  gameCount: Number(gameCount),
  sort: Number(sort),
  status: status as GameTaxonomyRecord['status'],
  updatedAt: `2026-08-${String(28 - index).padStart(2, '0')} 09:30`
}))

export const jackpotMockData = buildRecords(
  'JP',
  [
    'Mega Fortune Pool',
    'Dragon Progressive',
    'Golden Link',
    'Ocean Grand',
    'Temple Treasure',
    'Lucky Network',
    'Royal Crown',
    'Galaxy Pool',
    'Phoenix Rise',
    'Tiger Bonus',
    'Emerald Link',
    'Diamond Drop'
  ],
  ['Network', 'Local', 'Progressive'],
  ['Jackpot Ops', 'Finance Ops'],
  ['USD 1.24M', 'USD 820K', 'USD 640K', 'USD 390K']
)

export const playerMockData = buildRecords(
  'P',
  [
    'Player 884201',
    'Player 719304',
    'Player 553819',
    'Player 420118',
    'Player 902771',
    'Player 618420',
    'Player 330912',
    'Player 775103',
    'Player 188420',
    'Player 641029',
    'Player 294610',
    'Player 903118',
    'Player 500723',
    'Player 811046',
    'Player 460891'
  ],
  ['VIP', 'Regular', 'New'],
  ['NovaBet', 'Astra88', 'Orion Play', 'Lucky Harbor'],
  ['Turnover 82K', 'Turnover 41K', 'Turnover 19K', 'Turnover 126K']
)

export const betMockData = buildRecords(
  'B',
  Array.from({ length: 18 }, (_, index) => `BET-${202608310001 + index}`),
  ['Settled', 'Open', 'Cancelled'],
  ['Dragon Vault', 'Neon Tiger', 'Royal Baccarat', 'Fortune Ox'],
  ['Bet 120 / Win 0', 'Bet 500 / Win 760', 'Bet 80 / Win 24', 'Bet 1,000 / Win 0']
)

export const transactionMockData = buildRecords(
  'TX',
  Array.from({ length: 16 }, (_, index) => `TXN-${202608310401 + index}`),
  ['Bet', 'Win', 'Refund', 'Adjustment'],
  ['Wallet Gateway', 'Merchant Wallet', 'Ops Adjustment'],
  ['USD 120.00', 'USD 760.00', 'USD 80.00', 'USD 1,000.00']
)

export const riskMockData = buildRecords(
  'R',
  [
    'High Frequency Bet',
    'Abnormal RTP Drift',
    'Duplicate Device',
    'Rapid Deposit Pattern',
    'Win Rate Spike',
    'Bonus Abuse',
    'Geo Mismatch',
    'Session Automation',
    'Multi-account Cluster',
    'Large Bet Alert',
    'Merchant Limit Breach',
    'Jackpot Pattern Alert'
  ],
  ['Player', 'Game', 'Merchant', 'Transaction'],
  ['Risk Rule Engine', 'Manual Review'],
  ['Score 92', 'Score 86', 'Score 78', 'Score 71']
)

export const versionMockData = buildRecords(
  'VER',
  [
    'Dragon Vault 2.4.1',
    'Neon Tiger 1.9.0',
    'Lucky Panda 3.1.2',
    'Cyber Koi 1.4.8',
    'Pharaoh Link 2.0.5',
    'Ocean Riches 4.3.0',
    'Temple Run 1.8.4',
    'Fortune Ox 2.7.1',
    'Galaxy Gems 1.5.6',
    'Royal Baccarat 5.2.0',
    'Mystic Wheel 1.3.9',
    'Golden Phoenix 3.0.2'
  ],
  ['Production', 'Staging', 'Review'],
  ['Release Team'],
  ['Build Ready', 'QA 84%', '2 Issues']
)

export const assetMockData = buildRecords(
  'AST',
  [
    'Dragon Vault Lobby',
    'Dragon Vault Thumbnail',
    'Neon Tiger Banner',
    'Lucky Panda Lobby',
    'Cyber Koi Poster',
    'Pharaoh Link Thumbnail',
    'Ocean Riches Banner',
    'Temple Run Lobby',
    'Fortune Ox Poster',
    'Galaxy Gems Lobby',
    'Royal Baccarat Banner',
    'Mystic Wheel Thumbnail'
  ],
  ['Banner', 'Thumbnail', 'Lobby', 'Poster'],
  ['Creative Studio'],
  ['1920×1080', '800×800', '1200×628']
)

export const integrationMockData = buildRecords(
  'INT',
  [
    'NovaBet Production',
    'Astra88 Production',
    'Orion Play UAT',
    'Lucky Harbor Production',
    'Vega Club Sandbox',
    'Golden Reel Production',
    'Moonlight UAT',
    'Royal Spin Production',
    'BetWorks Sandbox',
    'Titan Arena Production',
    'Mango Play UAT',
    'Cloud Nine Production'
  ],
  ['Direct API', 'Aggregator', 'Seamless Wallet'],
  ['Integration Team'],
  ['Healthy', '182 ms', '99.98%', '2 Warnings']
)

export const settlementMockData = buildRecords(
  'STL',
  Array.from(
    { length: 14 },
    (_, index) => `Settlement 2026-W${String(index + 18).padStart(2, '0')}`
  ),
  ['Weekly', 'Monthly'],
  ['Finance Ops'],
  ['USD 284K', 'USD 192K', 'USD 418K', 'USD 126K']
)

export const maintenanceMockData = buildRecords(
  'MT',
  [
    'Dragon Vault Scheduled Window',
    'Neon Tiger Asset Refresh',
    'Provider API Upgrade',
    'Wallet Gateway Maintenance',
    'Jackpot Sync Maintenance',
    'Reporting Warehouse Window',
    'Royal Baccarat Patch',
    'Merchant Portal Notice',
    'Game CDN Maintenance',
    'Risk Rule Deployment',
    'Settlement Cut-off Notice',
    'Login Service Window'
  ],
  ['Maintenance', 'Announcement', 'Release'],
  ['Platform Ops'],
  ['30 min', '60 min', 'No downtime']
)

export const systemMockData = buildRecords(
  'SYS',
  [
    'Super Admin',
    'Operations Manager',
    'Risk Analyst',
    'Finance Operator',
    'Game Manager',
    'Integration Engineer',
    'Support Lead',
    'Read-only Auditor',
    'Merchant Admin',
    'Release Manager',
    'Content Editor',
    'Settlement Reviewer'
  ],
  ['Role', 'User Group', 'Policy'],
  ['System Admin'],
  ['18 Permissions', '12 Users', '6 Modules']
)

export const genericCollections: Record<string, BusinessRecord[]> = {
  '/merchants': merchantMockData,
  '/games': gameMockData,
  '/game-taxonomy': gameMockData,
  '/game-math': gameMockData,
  '/game-versions': versionMockData,
  '/game-assets': assetMockData,
  '/jackpots': jackpotMockData,
  '/players': playerMockData,
  '/bets': betMockData,
  '/transactions': transactionMockData,
  '/risk': riskMockData,
  '/reports': betMockData,
  '/settlements': settlementMockData,
  '/integrations': integrationMockData,
  '/maintenance': maintenanceMockData,
  '/system': systemMockData,
  '/jackpot-merchants': jackpotMockData,
  '/jackpot-ledger': jackpotMockData,
  '/jackpot-payouts': jackpotMockData,
  '/jackpot-adjustments': jackpotMockData,
  '/risk-alerts': riskMockData,
  '/risk-rules': riskMockData,
  '/risk-cases': riskMockData,
  '/risk-logs': riskMockData,
  '/risk-whitelist': riskMockData,
  '/report-agents': betMockData,
  '/report-merchants': merchantMockData,
  '/report-games': gameMockData,
  '/report-players': playerMockData,
  '/report-rtp': gameMockData,
  '/report-jackpots': jackpotMockData,
  '/report-wallet': transactionMockData,
  '/report-transactions': transactionMockData,
  '/report-settlements': settlementMockData,
  '/round-replay': betMockData,
  '/wallet-transactions': transactionMockData,
  '/manual-transactions': transactionMockData,
  '/settlement-sheets': settlementMockData,
  '/merchant-reconciliation': settlementMockData,
  '/agent-reconciliation': settlementMockData,
  '/reconciliation-differences': settlementMockData,
  '/merchant-settlement-sheets': settlementMockData,
  '/agent-settlement-sheets': settlementMockData,
  '/wallet-reconciliation': settlementMockData,
  '/settlement-adjustments': settlementMockData,
  '/integration-credentials': integrationMockData,
  '/integration-testing': integrationMockData,
  '/integration-traces': integrationMockData,
  '/integration-docs': integrationMockData,
  '/notices': maintenanceMockData,
  '/system-roles': systemMockData,
  '/system-approvals': systemMockData,
  '/system-logs': systemMockData,
  '/system-currencies': systemMockData,
  '/system-exchange-rates': systemMockData,
  '/system-settlement-settings': systemMockData,
  '/system-languages': systemMockData,
  '/system-parameters': systemMockData,
  '/system-notifications': maintenanceMockData,
  '/system-credential-policy': systemMockData,
  '/system-settings': systemMockData
}

const collectionGroups: Array<[BusinessRecord[], string[]]> = [
  [
    gameMockData,
    [
      '/game-taxonomy-types',
      '/game-taxonomy-features',
      '/game-taxonomy-marketing',
      '/report-game-performance',
      '/report-rtp'
    ]
  ],
  [
    systemMockData,
    [
      '/approvals-pending',
      '/approvals-approved',
      '/approvals-rejected',
      '/approvals-logs',
      '/finance-currency-data',
      '/finance-transaction-currencies',
      '/finance-settlement-currencies',
      '/finance-currency-precision',
      '/finance-rates-daily',
      '/finance-rate-sources',
      '/finance-rate-adjustments',
      '/finance-rate-history',
      '/finance-rate-alerts',
      '/finance-rate-logs',
      '/finance-default-settlement-currency',
      '/finance-settlement-cycles',
      '/finance-settlement-rate-rules',
      '/finance-settlement-precision',
      '/finance-settlement-rounding',
      '/platform-accounts',
      '/platform-roles',
      '/platform-permissions',
      '/platform-sensitive-permissions',
      '/platform-data-scopes',
      '/platform-languages',
      '/platform-regions',
      '/platform-timezones',
      '/platform-basic-settings',
      '/platform-login-security',
      '/platform-operation-logs',
      '/platform-login-logs',
      '/platform-approval-logs',
      '/platform-error-logs'
    ]
  ],
  [
    settlementMockData,
    [
      '/settlement-exchange-snapshots',
      '/settlement-adjustments',
      '/settlement-change-logs',
      '/report-merchant-settlements',
      '/report-agent-settlements'
    ]
  ],
  [merchantMockData, ['/report-merchants', '/report-merchant-lines', '/report-agent-merchants']],
  [merchantMockData, ['/report-agents']],
  [transactionMockData, ['/report-bets', '/report-transactions', '/platform-notification-logs']],
  [maintenanceMockData, ['/platform-notification-rules']],
  [jackpotMockData, ['/report-jackpots']]
]

collectionGroups.forEach(([records, keys]) => {
  keys.forEach((key) => {
    genericCollections[key] = records
  })
})
