import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'en-IN' | 'hi' | 'mr'

export const LANGUAGE_LABEL: Record<Language, string> = {
  'en-IN': 'English (India)',
  hi: 'हिन्दी',
  mr: 'मराठी',
}

export const STRINGS: Record<Language, Record<string, string>> = {
  'en-IN': {
    settings: 'Settings',
    settingsDesc: 'Preferences are device-local for now — server sync lands with notifications.',
    notifications: 'In-app notifications',
    notificationsDesc: 'Order updates and queue alerts',
    sound: 'Sound announcements',
    soundDesc: '"Token A104 completed" voice alerts',
    darkMode: 'Dark mode',
    darkModeDesc: 'Low-light theme using ready design tokens',
    language: 'Regional language',
    languageDesc: 'Choose your preferred language',
    testVoice: 'Test voice',
    voiceDemo: 'Token A104 completed',
    saved: 'Saved to this device',
    navDashboard: 'Dashboard',
    navUpload: 'Upload',
    navOrders: 'Orders',
    navQueue: 'Queue',
    navPricing: 'Pricing',
    navQr: 'QR Codes',
    navShops: 'Shops',
    navUsers: 'Users',
    navAudit: 'Audit Log',
    navComplaints: 'Complaints',
    navOverview: 'Overview',
    profile: 'Profile',
    signOut: 'Sign out',
    signIn: 'Sign in',
    appTagCustomer: 'PRINT OS',
    appTagShop: 'SHOP OS',
    appTagAdmin: 'ADMIN',
    footerCustomer: '© {year} Inko — Smart Printing Platform.',
    footerShop: '© {year} Inko Shop — Queue & operations.',
    footerAdmin: '© {year} Inko Admin — Platform governance.',
    allSystems: 'All systems operational',
    operational: 'Operational',
    shopDashboard: 'Shop dashboard',
    queueFirstOps: 'Queue-first operations • shop data live below (KPIs are platform-wide)',
    manageQueue: 'Manage queue',
    platformOrders: 'Platform orders',
    platformRevenue: 'Platform revenue',
    shopsLabel: 'Shops',
    inQueue: 'In queue',
    netOfRefunds: 'Net of refunds',
    openNow: '{n} open now',
    todaySuffix: '{n} today',
    topTokensLive: 'Top tokens (live)',
    shownBelow: '{n} shown below',
    revenueByDay: 'Revenue by day',
    noRevenueYet: 'No revenue data yet',
    noRevenueDesc: 'Revenue appears here after paid orders come in.',
    revenuePerDay: 'Revenue per day',
    queueNow: 'Queue now',
    noTokensClear: 'No tokens — queue is clear',
    openQueue: 'Open queue →',
    printers: 'Printers',
    noPrinters: 'No printers registered',
    noPrintersDesc: 'Add your shop printers to track status and paper sizes.',
    paperInventory: 'Paper inventory',
    noStockTracked: 'No stock tracked',
    noStockDesc: 'Add paper stock rows to get low-stock alerts.',
    recentOrders: 'Recent orders',
    noOrdersShop: 'No orders for this shop yet — new orders appear here automatically.',
    tableOrder: 'Order',
    tableStatus: 'Status',
    tableDate: 'Date',
    tableAmount: 'Amount',
    dashboardTitle: 'Dashboard',
    qtyShort: 'Qty',
    lowBadge: 'LOW',
  },
  hi: {
    settings: 'सेटिंग्स',
    settingsDesc: 'प्राथमिकताएँ अभी डिवाइस पर सेव हैं — सर्वर सिंक जल्द आएगा।',
    notifications: 'ऐप नोटिफिकेशन',
    notificationsDesc: 'ऑर्डर और कतार अलर्ट',
    sound: 'ध्वनि घोषणाएँ',
    soundDesc: '"टोकन A104 पूरा हुआ" आवाज़ अलर्ट',
    darkMode: 'डार्क मोड',
    darkModeDesc: 'कम रोशनी वाली थीम',
    language: 'भाषा',
    languageDesc: 'अपनी भाषा चुनें',
    testVoice: 'आवाज़ परखें',
    voiceDemo: 'टोकन A104 पूरा हुआ',
    saved: 'इस डिवाइस पर सेव किया',
    navDashboard: 'डैशबोर्ड',
    navUpload: 'अपलोड',
    navOrders: 'ऑर्डर',
    navQueue: 'कतार',
    navPricing: 'मूल्य',
    navQr: 'क्यूआर कोड',
    navShops: 'दुकानें',
    navUsers: 'उपयोगकर्ता',
    navAudit: 'ऑडिट लॉग',
    navComplaints: 'शिकायतें',
    navOverview: 'अवलोकन',
    profile: 'प्रोफ़ाइल',
    signOut: 'साइन आउट',
    signIn: 'साइन इन',
    appTagCustomer: 'प्रिंट ओएस',
    appTagShop: 'शॉप ओएस',
    appTagAdmin: 'एडमिन',
    footerCustomer: '© {year} इंको — स्मार्ट प्रिंटिंग प्लेटफॉर्म।',
    footerShop: '© {year} इंको शॉप — कतार और संचालन।',
    footerAdmin: '© {year} इंको एडमिन — प्लेटफॉर्म प्रबंधन।',
    allSystems: 'सभी सिस्टम चालू हैं',
    operational: 'चालू',
    shopDashboard: 'शॉप डैशबोर्ड',
    queueFirstOps: 'कतार-प्रथम संचालन • शॉप डेटा नीचे लाइव (KPI पूरे प्लेटफॉर्म के)',
    manageQueue: 'कतार प्रबंधित करें',
    platformOrders: 'प्लेटफॉर्म ऑर्डर',
    platformRevenue: 'प्लेटफॉर्म राजस्व',
    shopsLabel: 'दुकानें',
    inQueue: 'कतार में',
    netOfRefunds: 'रिफंड घटाकर',
    openNow: '{n} अभी खुली हैं',
    todaySuffix: 'आज {n}',
    topTokensLive: 'शीर्ष टोकन (लाइव)',
    shownBelow: 'नीचे {n} दिख रहे हैं',
    revenueByDay: 'दिन-वार राजस्व',
    noRevenueYet: 'अभी कोई राजस्व नहीं',
    noRevenueDesc: 'भुगतान वाले ऑर्डर के बाद राजस्व यहाँ दिखेगा।',
    revenuePerDay: 'प्रति दिन राजस्व',
    queueNow: 'अभी कतार',
    noTokensClear: 'कोई टोकन नहीं — कतार खाली है',
    openQueue: 'कतार खोलें →',
    printers: 'प्रिंटर',
    noPrinters: 'कोई प्रिंटर नहीं',
    noPrintersDesc: 'स्थिति और पेपर साइज़ ट्रैक करने के लिए प्रिंटर जोड़ें।',
    paperInventory: 'पेपर इन्वेंटरी',
    noStockTracked: 'कोई स्टॉक नहीं',
    noStockDesc: 'लो-स्टॉक अलर्ट के लिए पेपर स्टॉक जोड़ें।',
    recentOrders: 'हाल के ऑर्डर',
    noOrdersShop: 'इस शॉप के लिए अभी कोई ऑर्डर नहीं — नए ऑर्डर यहाँ स्वतः दिखेंगे।',
    tableOrder: 'ऑर्डर',
    tableStatus: 'स्थिति',
    tableDate: 'तारीख',
    tableAmount: 'राशि',
    dashboardTitle: 'डैशबोर्ड',
    qtyShort: 'मात्रा',
    lowBadge: 'कम',
  },
  mr: {
    settings: 'सेटिंग्ज',
    settingsDesc: 'प्राधान्ये सध्या डिव्हाइसवर जतन आहेत.',
    notifications: 'अॅप सूचना',
    notificationsDesc: 'ऑर्डर आणि रांग सूचना',
    sound: 'आवाज घोषणा',
    soundDesc: '"टोकन A104 पूर्ण" आवाज',
    darkMode: 'डार्क मोड',
    darkModeDesc: 'कमी प्रकाश थीम',
    language: 'भाषा',
    languageDesc: 'तुमची भाषा निवडा',
    testVoice: 'आवाज तपासा',
    voiceDemo: 'टोकन A104 पूर्ण झाले',
    saved: 'या डिव्हाइसवर जतन केले',
    navDashboard: 'डॅशबोर्ड',
    navUpload: 'अपलोड',
    navOrders: 'ऑर्डर',
    navQueue: 'रांग',
    navPricing: 'किंमत',
    navQr: 'क्यूआर कोड',
    navShops: 'दुकाने',
    navUsers: 'वापरकर्ते',
    navAudit: 'ऑडिट लॉग',
    navComplaints: 'तक्रारी',
    navOverview: 'आढावा',
    profile: 'प्रोफाइल',
    signOut: 'साइन आउट',
    signIn: 'साइन इन',
    appTagCustomer: 'प्रिंट ओएस',
    appTagShop: 'शॉप ओएस',
    appTagAdmin: 'अॅडमिन',
    footerCustomer: '© {year} इंको — स्मार्ट प्रिंटिंग।',
    footerShop: '© {year} इंको शॉप — रांग व ऑपरेशन्स।',
    footerAdmin: '© {year} इंको अॅडमिन — प्लॅटफॉर्म व्यवस्थापन।',
    allSystems: 'सर्व प्रणाली सुरू',
    operational: 'सुरू',
    shopDashboard: 'शॉप डॅशबोर्ड',
    queueFirstOps: 'रांग-प्रथम ऑपरेशन्स • शॉप डेटा खाली लाइव्ह (KPI संपूर्ण प्लॅटफॉर्मचे)',
    manageQueue: 'रांग व्यवस्थापित करा',
    platformOrders: 'प्लॅटफॉर्म ऑर्डर',
    platformRevenue: 'प्लॅटफॉर्म महसूल',
    shopsLabel: 'दुकाने',
    inQueue: 'रांगेत',
    netOfRefunds: 'परताव्यानंतर निव्वळ',
    openNow: '{n} आता उघडी',
    todaySuffix: 'आज {n}',
    topTokensLive: 'शीर्ष टोकन (लाइव्ह)',
    shownBelow: 'खाली {n} दाखवले',
    revenueByDay: 'दिवसानुसार महसूल',
    noRevenueYet: 'अद्याप महसूल नाही',
    noRevenueDesc: 'पेड ऑर्डर नंतर महसूल येथे दिसेल.',
    revenuePerDay: 'दररोजचा महसूल',
    queueNow: 'सध्याची रांग',
    noTokensClear: 'टोकन नाहीत — रांग मोकळी',
    openQueue: 'रांग उघडा →',
    printers: 'प्रिंटर',
    noPrinters: 'कोणतेही प्रिंटर नाहीत',
    noPrintersDesc: 'स्थिती व पेपर साइज ट्रॅक करण्यासाठी प्रिंटर जोडा.',
    paperInventory: 'पेपर इन्व्हेंटरी',
    noStockTracked: 'स्टॉक नाही',
    noStockDesc: 'लो-स्टॉक अलर्टसाठी पेपर स्टॉक जोडा.',
    recentOrders: 'अलीकडील ऑर्डर',
    noOrdersShop: 'या शॉपसाठी अजून ऑर्डर नाहीत — नवीन ऑर्डर येथे दिसतील.',
    tableOrder: 'ऑर्डर',
    tableStatus: 'स्थिती',
    tableDate: 'तारीख',
    tableAmount: 'रक्कम',
    dashboardTitle: 'डॅशबोर्ड',
    qtyShort: 'प्रमाण',
    lowBadge: 'कमी',
  },
}

export type Settings = {
  notifications: boolean
  sound: boolean
  darkMode: boolean
  language: Language
}

const KEY = 'inko.settings'
const DEFAULTS: Settings = { notifications: true, sound: false, darkMode: false, language: 'en-IN' }

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<Settings>
    return {
      notifications: typeof p.notifications === 'boolean' ? p.notifications : DEFAULTS.notifications,
      sound: typeof p.sound === 'boolean' ? p.sound : DEFAULTS.sound,
      darkMode: typeof p.darkMode === 'boolean' ? p.darkMode : DEFAULTS.darkMode,
      language: p.language === 'hi' || p.language === 'mr' || p.language === 'en-IN' ? p.language : DEFAULTS.language,
    }
  } catch { return DEFAULTS }
}

function persist(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function useSettingsStore() {
  const [settings, setSettings] = useState<Settings>(() => load())
  useEffect(() => { persist(settings) }, [settings])

  useEffect(() => {
    const root = document.documentElement
    if (settings.darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
    try { root.style.colorScheme = settings.darkMode ? 'dark' : 'light' } catch { /* ignore */ }
  }, [settings.darkMode])

  useEffect(() => {
    try { document.documentElement.lang = settings.language } catch { /* ignore */ }
  }, [settings.language])

  const t = useCallback((key: string) => STRINGS[settings.language][key] ?? STRINGS['en-IN'][key] ?? key, [settings.language])

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }))
  }, [])

  const speak = useCallback((text: string) => {
    if (!settings.sound) return
    try {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const pref = voices.find((x) => x.lang.startsWith(settings.language === 'en-IN' ? 'en' : settings.language)) ?? voices.find((x) => x.lang.startsWith('en')) ?? null
      if (pref) u.voice = pref
      u.lang = settings.language === 'en-IN' ? 'en-IN' : settings.language === 'hi' ? 'hi-IN' : 'mr-IN'
      u.rate = 0.95
      window.speechSynthesis.speak(u)
    } catch { /* ignore */ }
  }, [settings.sound, settings.language])

  return useMemo(() => ({ settings, set, t, speak }), [settings, set, t, speak])
}

type Ctx = ReturnType<typeof useSettingsStore>
const Ctx = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const store = useSettingsStore()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useSettings() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSettings must be inside SettingsProvider')
  return c
}
