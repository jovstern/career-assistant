import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ResumeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  /** Markdown is rendered inside .prose-resume styling in the preview tab. */
  proseClassName?: string
}

/** A write/preview markdown editor shared by the resume and profile pages. */
export function ResumeEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  className,
  proseClassName,
}: ResumeEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  return (
    <div className={className}>
      <ToggleGroup
        value={[tab]}
        onValueChange={(values) => {
          const next = values[0] as typeof tab | undefined
          if (next) setTab(next)
        }}
        className="gap-1.5"
      >
        <ToggleGroupItem
          value="write"
          className="h-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-normal text-slate-500 transition-colors hover:bg-slate-200 data-pressed:bg-cobalt data-pressed:text-white"
        >
          Write
        </ToggleGroupItem>
        <ToggleGroupItem
          value="preview"
          disabled={!value.trim()}
          className="h-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-normal text-slate-500 transition-colors hover:bg-slate-200 data-pressed:bg-cobalt data-pressed:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Preview
        </ToggleGroupItem>
      </ToggleGroup>

      {tab === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="mt-2 font-mono text-xs"
        />
      ) : (
        <article
          className={cn(
            'prose-resume mt-2 rounded-lg border border-slate-200 bg-white p-6',
            proseClassName
          )}
        >
          <ReactMarkdown>{value}</ReactMarkdown>
        </article>
      )}
    </div>
  )
}
