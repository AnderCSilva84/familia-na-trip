function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawMetric(context, { x, y, width, label, value, accent }) {
  context.fillStyle = 'rgba(255,255,255,0.94)'
  roundedRect(context, x, y, width, 230, 44)
  context.fill()

  context.fillStyle = '#64748b'
  context.font = '500 34px Arial'
  context.fillText(label, x + 42, y + 62)

  context.fillStyle = accent
  context.font = '700 58px Arial'
  context.fillText(value, x + 42, y + 148)
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem de fundo.'))
    image.src = source
  })
}

export async function createTravelShareCard({
  tripName,
  destination,
  daysTogether,
  statesVisited,
  citiesVisited,
  distances,
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')

  try {
    const familyImage = await loadImage('/familia.png')
    const sourceRatio = familyImage.width / familyImage.height
    const canvasRatio = canvas.width / canvas.height
    let sourceWidth = familyImage.width
    let sourceHeight = familyImage.height
    let sourceX = 0
    let sourceY = 0

    if (sourceRatio > canvasRatio) {
      sourceWidth = familyImage.height * canvasRatio
      sourceX = (familyImage.width - sourceWidth) / 2
    } else {
      sourceHeight = familyImage.width / canvasRatio
      sourceY = (familyImage.height - sourceHeight) / 2
    }

    context.drawImage(
      familyImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  } catch {
    context.fillStyle = '#ccfbf1'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  const background = context.createLinearGradient(0, 0, 1080, 1920)
  background.addColorStop(0, 'rgba(204,251,241,0.78)')
  background.addColorStop(0.46, 'rgba(248,250,252,0.84)')
  background.addColorStop(1, 'rgba(254,243,199,0.76)')
  context.fillStyle = background
  context.fillRect(0, 0, 1080, 1920)

  context.fillStyle = 'rgba(20,184,166,0.12)'
  context.beginPath()
  context.arc(930, 180, 310, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(251,146,60,0.10)'
  context.beginPath()
  context.arc(120, 1780, 360, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#0f766e'
  context.beginPath()
  context.arc(120, 120, 58, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#ffffff'
  context.font = '700 34px Arial'
  context.textAlign = 'center'
  context.fillText('FT', 120, 132)
  context.textAlign = 'left'
  context.fillStyle = '#0f766e'
  context.font = '700 34px Arial'
  context.fillText('FAMÍLIA NA TRIP', 205, 132)

  context.fillStyle = '#0f172a'
  context.font = '700 76px Arial'
  context.fillText(tripName || 'Nossa viagem em família', 70, 310, 940)
  context.fillStyle = '#475569'
  context.font = '500 38px Arial'
  context.fillText(destination || 'Memórias que ficam para sempre', 74, 378, 930)

  drawMetric(context, { x: 70, y: 480, width: 455, label: 'Dias juntos', value: String(daysTogether), accent: '#0f172a' })
  drawMetric(context, { x: 555, y: 480, width: 455, label: 'Estados visitados', value: String(statesVisited), accent: '#0f172a' })
  drawMetric(context, { x: 70, y: 740, width: 455, label: 'Cidades visitadas', value: String(citiesVisited), accent: '#0f172a' })
  drawMetric(context, {
    x: 555,
    y: 740,
    width: 455,
    label: 'Distância total',
    value: `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(distances.total)} km`,
    accent: '#0f766e',
  })

  context.fillStyle = 'rgba(15,118,110,0.96)'
  roundedRect(context, 70, 1030, 940, 490, 54)
  context.fill()
  context.fillStyle = '#ffffff'
  context.font = '700 44px Arial'
  context.fillText('Nossa jornada', 120, 1110)

  const modes = [
    ['✈', 'De avião', distances.plane],
    ['●', 'De carro', distances.car],
    ['●', 'Transporte público', distances.transit],
    ['●', 'Andando', distances.walking],
  ]
  modes.forEach(([icon, label, value], index) => {
    const y = 1180 + index * 90
    context.fillStyle = index === 0 ? '#fef3c7' : index === 1 ? '#ccfbf1' : '#ffffff'
    context.font = '700 40px Arial'
    context.fillText(icon, 125, y)
    context.fillStyle = '#d1fae5'
    context.font = '500 36px Arial'
    context.fillText(label, 200, y)
    context.fillStyle = '#ffffff'
    context.font = '700 42px Arial'
    context.textAlign = 'right'
    context.fillText(`${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} km`, 950, y)
    context.textAlign = 'left'
  })

  context.fillStyle = '#0f172a'
  context.font = '700 54px Arial'
  context.textAlign = 'center'
  context.fillText('Colecionando lugares e memórias.', 540, 1670)
  context.fillStyle = '#64748b'
  context.font = '500 30px Arial'
  context.fillText('Feito com Família na Trip', 540, 1740)
  context.textAlign = 'left'

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Não foi possível gerar a imagem da viagem.'))
    }, 'image/png')
  })
}

export async function shareTravelCard(data) {
  const blob = await createTravelShareCard(data)
  const file = new File([blob], 'resumo-familia-na-trip.png', { type: 'image/png' })

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      title: data.tripName || 'Resumo da nossa viagem',
      text: 'Olha o resumo da nossa viagem em família!',
      files: [file],
    })
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
