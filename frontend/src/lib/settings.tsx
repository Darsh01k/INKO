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
