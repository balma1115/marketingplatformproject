"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_1 = require("@prisma/client");
const sqs = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const prisma = new client_1.PrismaClient();
const handler = async (event) => {
    try {
        const { userId, trackingType } = JSON.parse(event.body || '{}');
        if (!userId || !trackingType) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'userId and trackingType are required' })
            };
        }
        let keywords = [];
        let queueUrl = '';
        if (trackingType === 'blog') {
            // 블로그 키워드 조회
            const blogProjects = await prisma.blogTrackingProject.findMany({
                where: { userId: parseInt(userId) },
                include: {
                    keywords: {
                        where: { isActive: true }
                    }
                }
            });
            keywords = blogProjects.flatMap(project => project.keywords.map(k => ({
                keywordId: k.id,
                keyword: k.keyword,
                projectId: project.id,
                blogUrl: project.blogUrl,
                blogName: project.blogName
            })));
            queueUrl = process.env.BLOG_QUEUE_URL;
        }
        else if (trackingType === 'smartplace') {
            // 스마트플레이스 키워드 조회
            const smartPlaces = await prisma.smartPlace.findMany({
                where: { userId: parseInt(userId) },
                include: {
                    keywords: {
                        where: { isActive: true }
                    }
                }
            });
            keywords = smartPlaces.flatMap(place => place.keywords.map(k => ({
                keywordId: k.id,
                keyword: k.keyword,
                placeId: place.placeId,
                placeName: place.placeName
            })));
            queueUrl = process.env.SMARTPLACE_QUEUE_URL;
        }
        if (keywords.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'No active keywords found',
                    count: 0
                })
            };
        }
        // SQS에 메시지 배치 전송 (10개씩 나눠서)
        const batches = [];
        for (let i = 0; i < keywords.length; i += 10) {
            const batch = keywords.slice(i, i + 10).map((keyword, index) => ({
                Id: `${i + index}`,
                MessageBody: JSON.stringify({
                    ...keyword,
                    userId,
                    trackingType,
                    timestamp: new Date().toISOString()
                })
            }));
            batches.push(batch);
        }
        // 배치 메시지 전송
        const results = await Promise.all(batches.map(batch => sqs.send(new client_sqs_1.SendMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: batch
        }))));
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Tracking jobs queued successfully',
                totalKeywords: keywords.length,
                batches: batches.length
            })
        };
    }
    catch (error) {
        console.error('Error in orchestrator:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
    finally {
        await prisma.$disconnect();
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map