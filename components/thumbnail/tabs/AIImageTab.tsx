'use client'

import { useState } from 'react'
import { Wand2, Sparkles, Image, Loader2 } from 'lucide-react'

interface AIImageTabProps {
  onAddLayer: (layer: any) => void
  canvasSize: { width: number; height: number }
}

type AIModel = 'gemini-nano' | 'flux-pro' | 'flux-ultra' | 'flux-kontext'

export default function AIImageTab({ onAddLayer, canvasSize }: AIImageTabProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-nano')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [editingImage, setEditingImage] = useState<string | null>(null)

  const aiModels = [
    { id: 'gemini-nano', name: 'Gemini Nano Banana', description: '구글 멀티모달 이미지 생성' },
    { id: 'flux-pro', name: 'Flux 1.1 Pro', description: '고품질 이미지 생성' },
    { id: 'flux-ultra', name: 'Flux 1.1 Ultra', description: '초고해상도 이미지' },
    { id: 'flux-kontext', name: 'Flux Kontext', description: '컨텍스트 기반 편집' },
  ]

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          model: selectedModel,
          width: canvasSize.width,
          height: canvasSize.height,
          referenceImage,
          editingImage
        })
      })

      if (!response.ok) throw new Error('Failed to generate image')

      const data = await response.json()
      const imageSrc = data.imageUrl || data.imageBase64

      setGeneratedImages(prev => [imageSrc, ...prev])

      // Add generated image to canvas
      const layer = {
        type: 'image' as const,
        content: {
          src: imageSrc,
          objectFit: 'cover',
          brightness: 100,
          contrast: 100,
          saturate: 100,
        },
        position: { x: 0, y: 0 },
        size: { width: canvasSize.width, height: canvasSize.height },
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        name: `AI 이미지 - ${selectedModel}`
      }
      onAddLayer(layer)
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('이미지 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setReferenceImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleEditingImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setEditingImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-4 space-y-4">
      {/* AI Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI 모델 선택
        </label>
        <div className="space-y-2">
          {aiModels.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id as AIModel)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${selectedModel === model.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                  <p className="text-xs text-gray-500">{model.description}</p>
                </div>
                {selectedModel === model.id && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          프롬프트
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="생성하고 싶은 이미지를 설명하세요..."
        />
      </div>

      {/* Negative Prompt (for Flux models) */}
      {selectedModel.includes('flux') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제외 프롬프트 (선택사항)
          </label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="제외하고 싶은 요소들..."
          />
        </div>
      )}

      {/* Reference Image Upload (for Gemini multi-modal) */}
      {selectedModel === 'gemini-nano' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            참조 이미지 (선택사항)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleReferenceImageUpload}
            className="hidden"
            id="reference-upload"
          />
          <label
            htmlFor="reference-upload"
            className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500"
          >
            {referenceImage ? (
              <img
                src={referenceImage}
                alt="Reference"
                className="w-full h-32 object-contain"
              />
            ) : (
              <>
                <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <span className="text-xs text-gray-500">참조 이미지 업로드</span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Editing Image Upload (for Flux Kontext) */}
      {selectedModel === 'flux-kontext' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            편집할 이미지
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleEditingImageUpload}
            className="hidden"
            id="editing-upload"
          />
          <label
            htmlFor="editing-upload"
            className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500"
          >
            {editingImage ? (
              <img
                src={editingImage}
                alt="Editing"
                className="w-full h-32 object-contain"
              />
            ) : (
              <>
                <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <span className="text-xs text-gray-500">편집할 이미지 업로드</span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Quick Prompts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          빠른 프롬프트
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            '미니멀한 디자인',
            '화려한 배경',
            '비즈니스 스타일',
            '귀여운 일러스트',
            '사실적인 사진',
            '추상적 아트'
          ].map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => setPrompt(prev => prev + ' ' + quickPrompt)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateImage}
        disabled={isGenerating || !prompt.trim()}
        className={`
          w-full px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center space-x-2
          ${isGenerating
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'}
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>생성 중...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>AI 이미지 생성</span>
          </>
        )}
      </button>

      {/* Generated Images Gallery */}
      {generatedImages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            생성된 이미지
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {generatedImages.slice(0, 6).map((src, index) => (
              <div
                key={index}
                onClick={() => {
                  const layer = {
                    type: 'image' as const,
                    content: {
                      src,
                      objectFit: 'cover',
                      brightness: 100,
                      contrast: 100,
                      saturate: 100,
                    },
                    position: { x: 0, y: 0 },
                    size: { width: canvasSize.width, height: canvasSize.height },
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    name: `AI 이미지 ${index + 1}`
                  }
                  onAddLayer(layer)
                }}
                className="cursor-pointer group"
              >
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
                  <img
                    src={src}
                    alt={`Generated ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}