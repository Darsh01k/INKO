import { Select } from '@/components/ui'

export const COUNTRIES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US/CA +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+61', label: 'AU +61' },
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+880', label: 'BD +880' },
  { code: '+94', label: 'LK +94' },
  { code: '+977', label: 'NP +977' },
  { code: '+60', label: 'MY +60' },
  { code: '+65', label: 'SG +65' },
  { code: '+27', label: 'ZA +27' },
]

/** Country-code picker shown next to phone inputs. */
export function CountryCode({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2">
      <Select
        aria-label="Country calling code"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 w-[104px] border-0 bg-slate-100 px-2 py-0 text-xs shadow-none focus:ring-0"
      >
        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </Select>
    </div>
  )
}

export function fullPhone(cc: string, local: string) {
  const digits = local.replace(/[^0-9]/g, '')
  return `${cc}${digits}`
}
