import { Router, Request, Response } from 'express';
import { geminiService } from '../services/geminiService';
import { isValidGPTType } from '../config/gpt-prompts';
import { authMiddleware } from '../middleware/authMiddleware';
import { User } from '../models/User';
import pool from '../config/database';

const router = Router();

router.post('/generate-titles', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { topic, gptType, saveToDatabase = true } = req.body;
    console.log('Received request for topic:', topic, 'gptType:', gptType, 'userId:', userId);
    
    if (!topic) {
      return res.status(400).json({ 
        success: false, 
        error: '주제를 입력해주세요.' 
      });
    }

    if (!gptType || !isValidGPTType(gptType)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효한 GPT 타입을 지정해주세요.' 
      });
    }

    const titles = await geminiService.generateBlogTitles(topic, gptType);
    console.log('Generated titles:', titles);
    
    // 데이터베이스에 제목 저장 (옵션)
    if (saveToDatabase && titles && titles.length > 0) {
      const connection = await pool.getConnection();
      try {
        const insertPromises = titles.map((title: string) => {
          return connection.execute(
            `INSERT INTO blog_titles (user_id, title, generated_at) VALUES (?, ?, NOW())`,
            [userId, title]
          );
        });
        
        await Promise.all(insertPromises);
        console.log(`Saved ${titles.length} titles to database for user ${userId}`);
      } catch (dbError) {
        console.error('Error saving titles to database:', dbError);
        // 저장 실패는 무시하고 계속 진행 (제목은 이미 생성됨)
      } finally {
        connection.release();
      }
    }
    
    return res.json({
      success: true,
      titles,
      savedToDatabase: saveToDatabase
    });
  } catch (error) {
    console.error('Error in generate-titles:', error);
    return res.status(500).json({ 
      success: false, 
      error: '제목 생성 중 오류가 발생했습니다.' 
    });
  }
});

// 테스트 엔드포인트
router.get('/test-keyword', async (_req: Request, res: Response) => {
  console.log('=== TEST KEYWORD ENDPOINT CALLED ===');
  return res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

router.post('/generate-keywords', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    console.log('=== KEYWORD GENERATION ROUTE ===');
    console.log('Received topic:', topic);
    console.log('Request time:', new Date().toISOString());
    
    if (!topic) {
      return res.status(400).json({ 
        success: false, 
        error: '주제를 입력해주세요.' 
      });
    }

    console.log('Calling geminiService.generateKeywords...');
    const keywords = await geminiService.generateKeywords(topic);
    console.log('Generated keywords count:', keywords.length);
    console.log('First 3 keywords:', keywords.slice(0, 3));
    
    return res.json({
      success: true,
      keywords
    });
  } catch (error: any) {
    console.error('=== ERROR in generate-keywords ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // 구체적인 에러 메시지 반환
    return res.status(500).json({ 
      success: false, 
      error: error.message || '키워드 생성 중 오류가 발생했습니다.' 
    });
  }
});

router.post('/generate-toc', async (req: Request, res: Response) => {
  try {
    const { topic, title, gptType } = req.body;
    
    if (!topic || !title) {
      return res.status(400).json({ 
        success: false, 
        error: '주제와 제목을 입력해주세요.' 
      });
    }

    if (!gptType || !isValidGPTType(gptType)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효한 GPT 타입을 지정해주세요.' 
      });
    }

    const tableOfContents = await geminiService.generateTableOfContents(topic, title, gptType);
    
    return res.json({
      success: true,
      tableOfContents
    });
  } catch (error) {
    console.error('Error in generate-toc:', error);
    return res.status(500).json({ 
      success: false, 
      error: '목차 생성 중 오류가 발생했습니다.' 
    });
  }
});

router.post('/generate-content', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { author, topic, title, keywords, tableOfContents, gptType } = req.body;
    
    // 글 작성 비용: 3냥
    const cost = 3;
    
    // 사용자 코인 잔액 확인
    const currentBalance = await User.getCoinBalance(userId);
    if (currentBalance < cost) {
      return res.status(402).json({
        success: false,
        error: '코인이 부족합니다.',
        required: cost,
        balance: currentBalance
      });
    }
    
    console.log('=== GENERATE CONTENT REQUEST ===');
    console.log('Author:', author);
    console.log('Topic:', topic);
    console.log('Title:', title);
    console.log('Keywords:', keywords);
    console.log('TOC items:', tableOfContents?.length);
    console.log('GPT Type:', gptType);
    
    if (!topic || !title || !tableOfContents || tableOfContents.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '필수 정보가 누락되었습니다.' 
      });
    }

    if (!gptType || !isValidGPTType(gptType)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효한 GPT 타입을 지정해주세요.' 
      });
    }

    const content = await geminiService.generateBlogContent({
      author,
      topic,
      title,
      keywords,
      tableOfContents,
      gptType
    });
    
    console.log('Generated content length:', content.length);
    
    // 코인 차감
    try {
      await User.deductCoins(userId, cost);
    } catch (error) {
      return res.status(402).json({
        success: false,
        error: error instanceof Error ? error.message : '코인 차감에 실패했습니다.'
      });
    }
    
    // 경험치 추가 (블로그 글 작성: 20점)
    try {
      await User.addExperience(userId, 20, 'blog_write', `블로그 글 작성: ${title}`);
    } catch (error) {
      console.error('경험치 추가 실패:', error);
    }
    
    // 현재 잔액 조회
    const newBalance = await User.getCoinBalance(userId);
    
    return res.json({
      success: true,
      content,
      cost: cost,
      newBalance: newBalance
    });
  } catch (error: any) {
    console.error('Error in generate-content:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || '컨텐츠 생성 중 오류가 발생했습니다.' 
    });
  }
});

export default router;