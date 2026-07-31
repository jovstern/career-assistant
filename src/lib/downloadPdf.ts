import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

/** Render a DOM element to a multi-page A4 PDF and download it. */
export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const contentWidth = pageWidth - margin * 2
  const contentHeight = pageHeight - margin * 2

  // Height of one PDF page expressed in canvas pixels
  const pageCanvasHeight = Math.floor((contentHeight / contentWidth) * canvas.width)

  let rendered = 0
  let pageIndex = 0
  while (rendered < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - rendered)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceHeight
    const ctx = slice.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, rendered, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.95),
      'JPEG',
      margin,
      margin,
      contentWidth,
      (sliceHeight / canvas.width) * contentWidth
    )

    rendered += sliceHeight
    pageIndex++
  }

  pdf.save(filename)
}
