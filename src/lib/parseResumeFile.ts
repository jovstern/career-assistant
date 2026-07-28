import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
    )
  }
  return pages.join('\n\n').trim()
}

/** Extract plain text from an uploaded resume file (.pdf, .txt, .md). */
export async function parseResumeFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file)
  }
  if (/\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith('text/')) {
    return (await file.text()).trim()
  }
  throw new Error('Unsupported file type — upload a PDF, TXT, or Markdown file')
}
