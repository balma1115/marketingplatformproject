import { NextRequest, NextResponse } from 'next/server'

// 요청 크기 제한 설정
export const maxDuration = 60 // 60초 타임아웃
export const runtime = 'nodejs'

// 이미지 리사이즈 함수
function resizeBase64Image(base64String: string, maxSize: number = 800): string {
  // 이미지가 너무 크면 크기 정보만 제거 (실제 리사이즈는 클라이언트에서 처리)
  if (base64String.length > 500000) { // 500KB 이상이면
    console.log('Image too large, needs client-side resize')
    return '' // 빈 문자열 반환하여 클라이언트에서 처리하도록
  }
  return base64String
}

// Gemini API for Nano Banana
async function generateWithGemini(prompt: string, referenceImage?: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Google AI API key not configured')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

  const contents = []

  // Add reference images if provided
  if (referenceImage && referenceImage.length < 500000) {
    const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, '')
    contents.push({
      inlineData: {
        mimeType: 'image/png',
        data: base64Data
      }
    })
  }

  // Add text prompt
  contents.push({ text: prompt })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: contents }],
      generationConfig: {
        temperature: 0.8,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error:', errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()

  // Extract generated image from response
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`
      }
    }
  }

  // If no image, return a placeholder or generate with text-to-image fallback
  throw new Error('No image generated from Gemini')
}

// Flux API for Pro, Ultra, Kontext
async function generateWithFlux(
  prompt: string,
  model: string,
  width: number,
  height: number,
  negativePrompt?: string,
  editingImage?: string
) {
  const apiKey = process.env.BFL_API_KEY || process.env.FLUX_API_KEY

  if (!apiKey) {
    throw new Error('Flux API key not configured')
  }

  let endpoint = ''
  let requestBody: any = {
    prompt,
    width: Math.min(width, 1024), // 제한된 크기
    height: Math.min(height, 1024),
    prompt_upsampling: true,
    safety_tolerance: 2,
  }

  // Configure based on model type
  switch (model) {
    case 'flux-pro':
      endpoint = 'https://api.bfl.ai/v1/flux-pro-1.1'
      requestBody.steps = 50
      break
    case 'flux-ultra':
      endpoint = 'https://api.bfl.ai/v1/flux-pro-1.1-ultra'
      requestBody.aspect_ratio = `${width}:${height}`
      requestBody.raw = false
      break
    case 'flux-kontext':
      if (editingImage && editingImage.length < 500000) {
        endpoint = 'https://api.bfl.ai/v1/flux-pro-1.1-kontext-edit'
        const imageData = editingImage.replace(/^data:image\/\w+;base64,/, '')
        requestBody.image = imageData
        requestBody.mask = null // Auto-generate mask
      } else {
        endpoint = 'https://api.bfl.ai/v1/flux-pro-1.1-kontext'
      }
      break
  }

  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': apiKey,
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Flux API error:', errorText)
    throw new Error(`Flux API error: ${response.status}`)
  }

  const data = await response.json()

  // Get the task ID and poll for result
  if (data.id) {
    // Poll for result
    const resultEndpoint = `https://api.bfl.ai/v1/get_result?id=${data.id}`

    let attempts = 0
    const maxAttempts = 60 // 60 seconds timeout

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const resultResponse = await fetch(resultEndpoint, {
        headers: {
          'X-Key': apiKey,
        }
      })

      if (resultResponse.ok) {
        const resultData = await resultResponse.json()

        if (resultData.status === 'Ready' && resultData.result?.sample) {
          // Return the image URL or base64
          return resultData.result.sample
        } else if (resultData.status === 'Failed') {
          throw new Error('Image generation failed')
        }
      }

      attempts++
    }

    throw new Error('Image generation timeout')
  }

  throw new Error('No task ID received')
}

// Fallback: Generate placeholder image
function generatePlaceholderImage(prompt: string, width: number, height: number): string {
  // Simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#6b7280">
        AI Image Generation
      </text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#9ca3af">
        ${prompt.substring(0, 30)}...
      </text>
    </svg>
  `
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

export async function POST(request: NextRequest) {
  try {
    // 요청 크기 확인
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB 제한
      return NextResponse.json(
        { error: 'Request too large. Please use smaller images or compress them.' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const {
      prompt,
      negativePrompt,
      model,
      width = 1024,
      height = 1024,
      referenceImage,
      editingImage
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // 이미지 크기 체크 및 리사이즈
    const processedReferenceImage = referenceImage ? resizeBase64Image(referenceImage) : undefined
    const processedEditingImage = editingImage ? resizeBase64Image(editingImage) : undefined

    let imageResult: string

    try {
      // Route to appropriate API based on model
      if (model === 'gemini-nano') {
        // API 키가 없으면 placeholder 반환
        if (!process.env.GOOGLE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
          console.log('No Gemini API key, returning placeholder')
          imageResult = generatePlaceholderImage(prompt, width, height)
        } else {
          imageResult = await generateWithGemini(prompt, processedReferenceImage)
        }
      } else if (model.startsWith('flux-')) {
        // API 키가 없으면 placeholder 반환
        if (!process.env.BFL_API_KEY && !process.env.FLUX_API_KEY) {
          console.log('No Flux API key, returning placeholder')
          imageResult = generatePlaceholderImage(prompt, width, height)
        } else {
          imageResult = await generateWithFlux(
            prompt,
            model,
            width,
            height,
            negativePrompt,
            processedEditingImage
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid model selected' },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error('Generation error, using placeholder:', error)
      // 에러 발생시 placeholder 이미지 반환
      imageResult = generatePlaceholderImage(prompt, width, height)
    }

    // Return the generated image
    if (imageResult.startsWith('data:')) {
      return NextResponse.json({ imageBase64: imageResult })
    } else {
      return NextResponse.json({ imageUrl: imageResult })
    }
  } catch (error) {
    console.error('Image generation error:', error)

    // 최종 fallback
    const placeholderImage = generatePlaceholderImage('Error generating image', 512, 512)
    return NextResponse.json({ imageBase64: placeholderImage })
  }
}