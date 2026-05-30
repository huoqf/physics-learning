export async function captureCanvas(canvasEl: HTMLCanvasElement | SVGElement): Promise<string> {
  if (canvasEl instanceof HTMLCanvasElement) {
    return canvasEl.toDataURL('image/png')
  }

  if (canvasEl instanceof SVGElement) {
    const svgData = new XMLSerializer().serializeToString(canvasEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.src = url

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG as image'))
      }
    })
  }

  throw new Error('Element must be a canvas or SVG element')
}

export function downloadImage(dataUrl: string, filename: string = 'screenshot.png'): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function captureAndDownload(
  canvasEl: HTMLCanvasElement | SVGElement,
  filename: string = 'physics-animation.png'
): Promise<void> {
  try {
    const dataUrl = await captureCanvas(canvasEl)
    downloadImage(dataUrl, filename)
  } catch (error) {
    console.error('Failed to capture canvas:', error)
    throw error
  }
}
