"use strict";
/**
 * Lambda Function: Scheduled Trigger
 * 매일 새벽 2시(KST)에 자동으로 모든 활성 키워드 추적을 시작하는 스케줄러
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const sqs = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const SMARTPLACE_QUEUE_URL = process.env.SMARTPLACE_QUEUE_URL || '';
const BLOG_QUEUE_URL = process.env.BLOG_QUEUE_URL || '';
const handler = async (event, context) => {
    console.log('Scheduled tracking started at:', new Date().toISOString());
    try {
        // 1. 스마트플레이스 키워드 처리
        const smartPlaceKeywords = await prisma.smartPlaceKeyword.findMany({
            where: { isActive: true },
            include: {
                smartPlace: true
            }
        });
        console.log(`Found ${smartPlaceKeywords.length} active SmartPlace keywords`);
        for (const keyword of smartPlaceKeywords) {
            const message = {
                type: 'SMARTPLACE_TRACKING',
                keywordId: keyword.id,
                keyword: keyword.keyword,
                userId: keyword.userId,
                placeId: keyword.smartPlace?.placeId || '',
                placeName: keyword.smartPlace?.placeName || ''
            };
            await sqs.send(new client_sqs_1.SendMessageCommand({
                QueueUrl: SMARTPLACE_QUEUE_URL,
                MessageBody: JSON.stringify(message)
            }));
        }
        // 2. 블로그 키워드 처리
        const blogKeywords = await prisma.blogTrackingKeyword.findMany({
            where: { isActive: true },
            include: {
                project: true
            }
        });
        console.log(`Found ${blogKeywords.length} active Blog keywords`);
        for (const keyword of blogKeywords) {
            const message = {
                type: 'BLOG_TRACKING',
                keywordId: keyword.id,
                keyword: keyword.keyword,
                blogUrl: keyword.project.blogUrl,
                userId: keyword.project.userId,
                projectId: keyword.projectId
            };
            await sqs.send(new client_sqs_1.SendMessageCommand({
                QueueUrl: BLOG_QUEUE_URL,
                MessageBody: JSON.stringify(message)
            }));
        }
        // 3. 추적 세션 생성
        const session = await prisma.trackingSession.create({
            data: {
                userId: 0, // System triggered
                projectId: null,
                totalKeywords: smartPlaceKeywords.length + blogKeywords.length,
                completedKeywords: 0,
                status: 'in_progress'
            }
        });
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Scheduled tracking initiated',
                sessionId: session.id,
                smartPlaceKeywords: smartPlaceKeywords.length,
                blogKeywords: blogKeywords.length,
                totalKeywords: smartPlaceKeywords.length + blogKeywords.length
            })
        };
    }
    catch (error) {
        console.error('Error in scheduled trigger:', error);
        throw error;
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map