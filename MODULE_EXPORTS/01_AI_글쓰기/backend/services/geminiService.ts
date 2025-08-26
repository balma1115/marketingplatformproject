import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getGPTPrompts, commonReferenceFile } from '../config/gpt-prompts';
import { promises as fs } from 'fs';
import path from 'path';
import { tokenTrackingService } from './tokenTrackingService';

// Load environment variables first
dotenv.config();

let genAI: GoogleGenerativeAI | null = null;

console.log('Initializing Gemini Service...');
console.log('GEMINI_API_KEY from env:', process.env.GEMINI_API_KEY);

// Only initialize Gemini if API key is available
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  console.log('Creating GoogleGenerativeAI instance...');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('Gemini initialized successfully');
} else {
  console.log('Gemini not initialized - API key missing or invalid');
}

export class GeminiService {
  // 참조 파일 내용 읽기
  private async getReferenceContent(gptType: string, useFor: 'title' | 'toc' | 'content'): Promise<string> {
    try {
      const contents: string[] = [];
      
      // 1. 공통 가이드 파일 읽기
      if (commonReferenceFile.useFor.includes(useFor)) {
        try {
          const commonFilePath = path.join(process.cwd(), commonReferenceFile.path);
          const commonContent = await fs.readFile(commonFilePath, 'utf-8');
          contents.push(`\n\n=== ${commonReferenceFile.description} ===\n${commonContent}\n=== 끝 ===\n`);
        } catch (error) {
          console.error('Failed to read common guide file:', error);
        }
      }
      
      // 2. GPT별 참조 파일 읽기
      const gptPrompts = getGPTPrompts(gptType);
      if (gptPrompts && gptPrompts.referenceFiles) {
        const relevantFiles = gptPrompts.referenceFiles.filter(file => 
          file.useFor.includes(useFor)
        );

        const gptContents = await Promise.all(
          relevantFiles.map(async (file) => {
            try {
              const filePath = path.join(process.cwd(), file.path);
              const content = await fs.readFile(filePath, 'utf-8');
              return `\n\n=== ${file.description} ===\n${content}\n=== 끝 ===\n`;
            } catch (error) {
              console.error(`Failed to read reference file: ${file.path}`, error);
              return '';
            }
          })
        );
        
        contents.push(...gptContents);
      }

      return contents.join('\n');
    } catch (error) {
      console.error('Error reading reference files:', error);
      return '';
    }
  }
  async generateBlogTitles(topic: string, gptType: string): Promise<string[]> {
    console.log('=== GEMINI SERVICE: generateBlogTitles START ===');
    console.log('Topic:', topic);
    console.log('genAI available:', !!genAI);
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : 'Not set');
    
    if (!genAI) {
      console.log('ERROR: Gemini not initialized, returning fallback titles');
      return this.getFallbackTitles(topic);
    }
    
    try {
      console.log('Creating model with: gemini-2.0-flash-exp');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // GPT 타입별 프롬프트 가져오기
      const gptPrompts = getGPTPrompts(gptType);
      if (!gptPrompts) {
        throw new Error(`Invalid GPT type: ${gptType}`);
      }
      
      // 참조 파일 내용 가져오기
      const referenceContent = await this.getReferenceContent(gptType, 'title');
      
      const prompt = `${gptPrompts.titleGeneration}
${referenceContent ? `
참고 자료:${referenceContent}` : ''}

주제: ${topic}

블로그 제목 5개를 줄바꿈으로 구분해서 제시해주세요. 번호나 기호는 붙이지 마세요.`;

      console.log('Calling Gemini API with prompt length:', prompt.length);
      console.log('API URL will be:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent');
      
      // Count tokens before generating
      const inputTokenCount = await model.countTokens(prompt);
      console.log(`Input tokens: ${inputTokenCount.totalTokens}`);
      
      const result = await model.generateContent(prompt);
      console.log('Gemini API call completed');
      
      const response = await result.response;
      const text = response.text();
      console.log('=== GEMINI API RAW RESPONSE ===');
      console.log(text);
      console.log('=== END GEMINI API RESPONSE ===');
      
      // Count output tokens and track usage
      const outputTokenCount = await model.countTokens(text);
      console.log(`Output tokens: ${outputTokenCount.totalTokens}`);
      
      await tokenTrackingService.trackUsage({
        model: 'gemini-2.0-flash-exp',
        inputTokens: inputTokenCount.totalTokens,
        outputTokens: outputTokenCount.totalTokens,
        totalTokens: inputTokenCount.totalTokens + outputTokenCount.totalTokens,
        endpoint: 'generateBlogTitles'
      });
      
      const titles = text.split('\n').filter(title => title.trim().length > 0);
      console.log('Split into', titles.length, 'lines');
      
      // 번호나 불필요한 문자 제거
      const cleanedTitles = titles.map(title => 
        title.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim()
      ).slice(0, 5);
      
      console.log('=== CLEANED TITLES ===');
      cleanedTitles.forEach((title, index) => {
        console.log(`${index + 1}. ${title}`);
      });
      console.log('=== END CLEANED TITLES ===');
      
      return cleanedTitles;
    } catch (error: any) {
      console.error('=== GEMINI API ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error details:', error);
      console.error('=== END ERROR ===');
      console.log('RETURNING FALLBACK TITLES DUE TO ERROR');
      return this.getFallbackTitles(topic);
    }
  }

  private getFallbackTitles(topic: string): string[] {
    return [
      `${topic} 학원 창업, 초기 투자비용 500만원으로 시작하는 방법`,
      `미래엔영어 가맹점주가 말하는 ${topic} 프랜차이즈의 실제 수익성`,
      `${topic} 영어학원 운영 3년차 원장이 공개하는 월 매출 2천만원 달성 비법`,
      `예비 원장님이 꼭 알아야 할 ${topic} 학원 창업 실패 사례 7가지`,
      `${topic} 프랜차이즈 vs 개인 학원: 5년차 원장이 비교한 장단점`,
      `2025년 ${topic} 교육 시장 전망과 차별화된 운영 전략`,
      `${topic} 학원 성공을 위한 학부모 마케팅 노하우 완벽 정리`
    ];
  }

  async generateKeywords(topic: string): Promise<Array<{ keyword: string; searchVolume: string; competition: string }>> {
    console.log('=== GEMINI SERVICE: generateKeywords START ===');
    console.log('Topic:', topic);
    
    // 네이버 검색광고 API만 사용
    try {
      console.log('Importing naverSearchService...');
      const { naverSearchService } = await import('./naverSearchService');
      console.log('Calling naverSearchService.getRelatedKeywords...');
      const naverKeywords = await naverSearchService.getRelatedKeywords(topic);
      console.log('Keywords received from Naver Ads API:', naverKeywords.length);
      
      return naverKeywords;
    } catch (error: any) {
      console.error('=== KEYWORD GENERATION ERROR ===');
      console.error('Error:', error.message);
      
      // 네이버 검색광고 API 에러를 그대로 전달
      throw error;
    }
  }


  async generateTableOfContents(topic: string, title: string, gptType: string): Promise<Array<{ id: string; title: string; level: number }>> {
    if (!genAI) {
      return this.getFallbackTableOfContents(topic, title);
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // GPT 타입별 프롬프트 가져오기
      const gptPrompts = getGPTPrompts(gptType);
      if (!gptPrompts) {
        throw new Error(`Invalid GPT type: ${gptType}`);
      }
      
      // 참조 파일 내용 가져오기
      const referenceContent = await this.getReferenceContent(gptType, 'toc');
      
      const prompt = `${gptPrompts.tocGeneration}
${referenceContent ? `
참고 자료:${referenceContent}` : ''}

주제: ${topic}
제목: ${title}

형식 (정확히 이 형식을 따라주세요):
레벨|제목
(레벨 0: 대제목, 레벨 1: 소제목)`;

      // Count tokens before generating
      const inputTokenCount = await model.countTokens(prompt);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Count output tokens and track usage
      const outputTokenCount = await model.countTokens(text);
      
      await tokenTrackingService.trackUsage({
        model: 'gemini-2.0-flash-exp',
        inputTokens: inputTokenCount.totalTokens,
        outputTokens: outputTokenCount.totalTokens,
        totalTokens: inputTokenCount.totalTokens + outputTokenCount.totalTokens,
        endpoint: 'generateTableOfContents'
      });
      
      const lines = text.split('\n').filter(line => line.includes('|'));
      
      return lines.map((line, index) => {
        const parts = line.split('|').map(s => s.trim());
        const [level, title] = parts;
        return {
          id: `${index + 1}`,
          title: title?.replace(/[^\w\s가-힣?!]/g, '').trim() || `섹션 ${index + 1}`,
          level: parseInt(level) || 0
        };
      }).slice(0, 12);
    } catch (error) {
      console.error('Error generating table of contents:', error);
      return this.getFallbackTableOfContents(topic, title);
    }
  }
  
  private getFallbackTableOfContents(topic: string, _title: string): Array<{ id: string; title: string; level: number }> {
    return [
      { id: '1', title: `${topic}를 시작하기 전에 알아야 할 것들`, level: 0 },
      { id: '2', title: '현재 교육 시장의 변화와 기회', level: 1 },
      { id: '3', title: `${topic}의 핵심 가치`, level: 0 },
      { id: '4', title: `${topic}의 정의와 개념`, level: 1 },
      { id: '5', title: `${topic}의 주요 특징과 장점`, level: 1 },
      { id: '6', title: `${topic} 활용 방법과 실제 사례`, level: 1 },
      { id: '7', title: `${topic} 선택 시 고려사항`, level: 1 },
      { id: '8', title: `${topic}의 미래 전망`, level: 1 },
      { id: '9', title: '자주 묻는 질문과 답변', level: 1 },
      { id: '10', title: '성공적인 학원 운영을 위한 조언', level: 0 },
      { id: '11', title: '다음 단계로 나아가기', level: 1 },
    ];
  }

  async generateBlogContent(params: {
    author: string;
    topic: string;
    title: string;
    keywords: string;
    tableOfContents: Array<{ id: string; title: string; level: number }>;
    gptType: string;
  }): Promise<string> {
    console.log('=== GEMINI SERVICE: generateBlogContent START ===');
    console.log('Parameters:', JSON.stringify(params, null, 2));
    
    if (!genAI) {
      console.log('ERROR: Gemini not initialized');
      throw new Error('Gemini API가 초기화되지 않았습니다.');
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // GPT 타입별 프롬프트 가져오기
      const gptPrompts = getGPTPrompts(params.gptType);
      if (!gptPrompts) {
        throw new Error(`Invalid GPT type: ${params.gptType}`);
      }
      
      // 참조 파일 내용 가져오기
      const referenceContent = await this.getReferenceContent(params.gptType, 'content');
      
      const prompt = `${gptPrompts.contentGeneration}
${referenceContent ? `
참고 자료:${referenceContent}` : ''}

작성자: ${params.author}
주제: ${params.topic}
제목: ${params.title}
핵심 키워드: ${params.keywords}

목차:
${params.tableOfContents.map(item => {
  return `${item.level === 0 ? '[대제목]' : '[소제목]'} ${item.title}`;
}).join('\n')}

추가 요구사항:
1. 전체 분량은 공백 제외 2500자 이상으로 작성
2. 마크다운 문법(#, *, **, ### 등) 절대 사용 금지
3. 일반 텍스트로만 작성 (줄바꿈과 문단 구분만 사용)
4. 문단 사이는 빈 줄 하나로만 구분

블로그 글을 작성해주세요:`;

      console.log('Sending prompt to Gemini API...');
      
      // Count tokens before generating
      const inputTokenCount = await model.countTokens(prompt);
      console.log(`Blog content input tokens: ${inputTokenCount.totalTokens}`);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      // Count output tokens and track usage
      const outputTokenCount = await model.countTokens(content);
      console.log(`Blog content output tokens: ${outputTokenCount.totalTokens}`);
      
      await tokenTrackingService.trackUsage({
        model: 'gemini-2.0-flash-exp',
        inputTokens: inputTokenCount.totalTokens,
        outputTokens: outputTokenCount.totalTokens,
        totalTokens: inputTokenCount.totalTokens + outputTokenCount.totalTokens,
        endpoint: 'generateBlogContent'
      });
      
      console.log('Generated content length:', content.length);
      console.log('=== GEMINI SERVICE: generateBlogContent END ===');
      
      return content;
    } catch (error: any) {
      console.error('=== GEMINI BLOG CONTENT ERROR ===');
      console.error('Error:', error.message);
      console.error('Error details:', error);
      throw new Error('블로그 컨텐츠 생성 중 오류가 발생했습니다.');
    }
  }
}

export const geminiService = new GeminiService();