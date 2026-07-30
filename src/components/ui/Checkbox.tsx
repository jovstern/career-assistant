import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

interface Props {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function Checkbox({ checked, onCheckedChange, className = '' }: Props) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white transition-colors focus-visible:outline-2 focus-visible:outline-cobalt data-[state=checked]:border-cobalt data-[state=checked]:bg-cobalt ${className}`}
    >
      <RadixCheckbox.Indicator>
        <Check size={12} strokeWidth={3} className="text-white" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
