"use strict";
/**
 * Lambda Function: SmartPlace Ranking Tracker (Simplified Version)
 * 스마트플레이스 순위를 추적하는 Lambda 함수 - 간소화 버전
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * 한국 시간(KST) 기준 날짜 생성
 */
function getKSTDate() {
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + (kstOffset * 60000));
}
/**
 * 메인 핸들러 함수
 */
const handler = async (event, context) => {
    const startTime = Date.now();
    const results = [];
    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        console.log(`Processing smartplace keyword: ${message.keyword} (ID: ${message.keywordId})`);
        try {
            // 임시로 결과 저장 (실제 스크래핑은 EC2에서 수행)
            const checkDate = getKSTDate();
            await prisma.smartPlaceRanking.create({
                data: {
                    keywordId: message.keywordId,
                    checkDate,
                    organicRank: null,
                    adRank: null,
                    topTenPlaces: '[]'
                }
            });
            results.push({
                keywordId: message.keywordId,
                success: true,
                message: 'Queued for processing'
            });
            console.log(`Successfully queued smartplace keyword ${message.keyword}`);
        }
        catch (error) {
            console.error(`Error processing smartplace keyword ${message.keyword}:`, error);
            results.push({
                keywordId: message.keywordId,
                success: false,
                error: error.message
            });
            throw error;
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'SmartPlace tracking requests queued',
            results,
            totalDuration: (Date.now() - startTime) / 1000
        })
    };
};
exports.handler = handler;
//# sourceMappingURL=index.js.map