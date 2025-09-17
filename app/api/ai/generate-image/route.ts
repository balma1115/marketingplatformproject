import { NextRequest, NextResponse } from 'next/server'

// Gemini API for Nano Banana
async function generateWithGemini(prompt: string, referenceImage?: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Google AI API key not configured')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

  const contents = []

  // Add reference images if provided
  if (referenceImage) {
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

  throw new Error('No image generated')
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
    width,
    height,
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
      if (editingImage) {
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

export async function POST(request: NextRequest) {
  try {
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

    let imageResult: string

    // Route to appropriate API based on model
    if (model === 'gemini-nano') {
      imageResult = await generateWithGemini(prompt, referenceImage)
    } else if (model.startsWith('flux-')) {
      imageResult = await generateWithFlux(
        prompt,
        model,
        width,
        height,
        negativePrompt,
        editingImage
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      )
    }

    // Return the generated image
    if (imageResult.startsWith('data:')) {
      return NextResponse.json({ imageBase64: imageResult })
    } else {
      return NextResponse.json({ imageUrl: imageResult })
    }
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image', details: (error as Error).message },
      { status: 500 }
    )
  }
}