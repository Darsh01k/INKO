export function announceToken(tokenNumber: string, lang: string = 'en-IN') {
  try {
    if (!('speechSynthesis' in window)) return
    const enabled = (() => { try { return JSON.parse(localStorage.getItem('inko.settings') ?? '{}').sound !== false } catch { return false } })()
    if (!enabled) return
    window.speechSynthesis.cancel()
    const text = lang === 'hi' ? `टोकन ${tokenNumber} पूरा हुआ` : lang === 'mr' ? `टोकन ${tokenNumber} पूर्ण झाले` : `Token ${tokenNumber} completed`
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    u.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(x => x.lang.startsWith(u.lang.slice(0,2))) ?? voices.find(x => x.lang.startsWith('en')) ?? null
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}
