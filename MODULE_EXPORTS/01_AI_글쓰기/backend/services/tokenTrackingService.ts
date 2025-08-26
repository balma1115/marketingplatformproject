import { promises as fs } from 'fs';
import path from 'path';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  timestamp: Date;
  endpoint?: string;
  userId?: string;
  cost?: number;
}

export interface TokenCost {
  inputCostPer1K: number;
  outputCostPer1K: number;
  longContextMultiplier?: number; // For requests > 200K tokens
  batchModeDiscount?: number; // 50% discount for batch mode
}

export interface ModelPricing {
  [model: string]: TokenCost;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  periodStart: Date;
  periodEnd: Date;
  byModel: {
    [model: string]: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      requestCount: number;
    };
  };
}

export class TokenTrackingService {
  private static instance: TokenTrackingService;
  private usageLog: TokenUsage[] = [];
  private usageFilePath: string;
  
  // Pricing as of 2025 (in USD per 1K tokens)
  private readonly pricing: ModelPricing = {
    'gemini-2.0-flash-exp': {
      inputCostPer1K: 0.000075,  // $0.075 per 1M tokens
      outputCostPer1K: 0.0003,    // $0.30 per 1M tokens
      longContextMultiplier: 2,    // 2x for > 200K tokens
      batchModeDiscount: 0.5       // 50% discount
    },
    'gemini-1.5-flash': {
      inputCostPer1K: 0.000075,
      outputCostPer1K: 0.0003,
      longContextMultiplier: 2,
      batchModeDiscount: 0.5
    },
    'gemini-1.5-pro': {
      inputCostPer1K: 0.00125,    // $1.25 per 1M tokens
      outputCostPer1K: 0.005,      // $5.00 per 1M tokens
      longContextMultiplier: 2,
      batchModeDiscount: 0.5
    },
    'gemini-2.0-pro': {
      inputCostPer1K: 0.00125,
      outputCostPer1K: 0.005,
      longContextMultiplier: 2,
      batchModeDiscount: 0.5
    }
  };

  private constructor() {
    this.usageFilePath = path.join(process.cwd(), 'token-usage.json');
    this.loadUsageLog();
  }

  static getInstance(): TokenTrackingService {
    if (!TokenTrackingService.instance) {
      TokenTrackingService.instance = new TokenTrackingService();
    }
    return TokenTrackingService.instance;
  }

  /**
   * Track token usage for a request
   */
  async trackUsage(usage: Omit<TokenUsage, 'timestamp' | 'cost'>): Promise<void> {
    const cost = this.calculateCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.totalTokens > 200000 // Long context check
    );

    const usageEntry: TokenUsage = {
      ...usage,
      timestamp: new Date(),
      cost
    };

    this.usageLog.push(usageEntry);
    await this.saveUsageLog();

    console.log(`Token usage tracked - Model: ${usage.model}, Input: ${usage.inputTokens}, Output: ${usage.outputTokens}, Cost: $${cost.toFixed(6)}`);
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number, isLongContext: boolean = false, isBatchMode: boolean = false): number {
    const modelPricing = this.pricing[model];
    if (!modelPricing) {
      console.warn(`Pricing not found for model: ${model}, using default pricing`);
      return 0;
    }

    let inputCost = (inputTokens / 1000) * modelPricing.inputCostPer1K;
    let outputCost = (outputTokens / 1000) * modelPricing.outputCostPer1K;

    // Apply long context multiplier if applicable
    if (isLongContext && modelPricing.longContextMultiplier) {
      inputCost *= modelPricing.longContextMultiplier;
      outputCost *= modelPricing.longContextMultiplier;
    }

    // Apply batch mode discount if applicable
    if (isBatchMode && modelPricing.batchModeDiscount) {
      inputCost *= modelPricing.batchModeDiscount;
      outputCost *= modelPricing.batchModeDiscount;
    }

    return inputCost + outputCost;
  }

  /**
   * Get usage summary for a time period
   */
  async getUsageSummary(startDate?: Date, endDate?: Date): Promise<UsageSummary> {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const filteredUsage = this.usageLog.filter(
      entry => entry.timestamp >= start && entry.timestamp <= end
    );

    const summary: UsageSummary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: filteredUsage.length,
      periodStart: start,
      periodEnd: end,
      byModel: {}
    };

    filteredUsage.forEach(entry => {
      summary.totalInputTokens += entry.inputTokens;
      summary.totalOutputTokens += entry.outputTokens;
      summary.totalTokens += entry.totalTokens;
      summary.totalCost += entry.cost || 0;

      if (!summary.byModel[entry.model]) {
        summary.byModel[entry.model] = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          requestCount: 0
        };
      }

      summary.byModel[entry.model].inputTokens += entry.inputTokens;
      summary.byModel[entry.model].outputTokens += entry.outputTokens;
      summary.byModel[entry.model].totalTokens += entry.totalTokens;
      summary.byModel[entry.model].cost += entry.cost || 0;
      summary.byModel[entry.model].requestCount += 1;
    });

    return summary;
  }

  /**
   * Get daily usage report
   */
  async getDailyUsage(date?: Date): Promise<UsageSummary> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getUsageSummary(startOfDay, endOfDay);
  }

  /**
   * Get monthly usage report
   */
  async getMonthlyUsage(year?: number, month?: number): Promise<UsageSummary> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    return this.getUsageSummary(startOfMonth, endOfMonth);
  }

  /**
   * Set cost alert threshold
   */
  async setCostAlert(dailyLimit: number, monthlyLimit: number): Promise<void> {
    const alertConfig = {
      dailyLimit,
      monthlyLimit,
      enabled: true
    };

    await fs.writeFile(
      path.join(process.cwd(), 'token-alert-config.json'),
      JSON.stringify(alertConfig, null, 2)
    );
  }

  /**
   * Check if usage exceeds alert thresholds
   */
  async checkCostAlerts(): Promise<{ daily: boolean; monthly: boolean; dailyCost?: number; monthlyCost?: number }> {
    try {
      const configPath = path.join(process.cwd(), 'token-alert-config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      if (!config.enabled) {
        return { daily: false, monthly: false };
      }

      const dailyUsage = await this.getDailyUsage();
      const monthlyUsage = await this.getMonthlyUsage();

      return {
        daily: dailyUsage.totalCost > config.dailyLimit,
        monthly: monthlyUsage.totalCost > config.monthlyLimit,
        dailyCost: dailyUsage.totalCost,
        monthlyCost: monthlyUsage.totalCost
      };
    } catch (error) {
      return { daily: false, monthly: false };
    }
  }

  /**
   * Export usage data to CSV
   */
  async exportToCSV(filePath: string, startDate?: Date, endDate?: Date): Promise<void> {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const filteredUsage = this.usageLog.filter(
      entry => entry.timestamp >= start && entry.timestamp <= end
    );

    const headers = 'Timestamp,Model,Endpoint,Input Tokens,Output Tokens,Total Tokens,Cost (USD)\n';
    const rows = filteredUsage.map(entry => 
      `${entry.timestamp.toISOString()},${entry.model},${entry.endpoint || 'N/A'},${entry.inputTokens},${entry.outputTokens},${entry.totalTokens},${entry.cost?.toFixed(6) || '0'}`
    ).join('\n');

    await fs.writeFile(filePath, headers + rows);
  }

  /**
   * Clear usage log (with backup)
   */
  async clearUsageLog(createBackup: boolean = true): Promise<void> {
    if (createBackup && this.usageLog.length > 0) {
      const backupPath = path.join(
        process.cwd(), 
        `token-usage-backup-${new Date().toISOString().replace(/:/g, '-')}.json`
      );
      await fs.writeFile(backupPath, JSON.stringify(this.usageLog, null, 2));
    }

    this.usageLog = [];
    await this.saveUsageLog();
  }

  /**
   * Load usage log from file
   */
  private async loadUsageLog(): Promise<void> {
    try {
      const data = await fs.readFile(this.usageFilePath, 'utf-8');
      const loadedData = JSON.parse(data);
      
      // Convert timestamp strings to Date objects
      this.usageLog = loadedData.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    } catch (error) {
      // File doesn't exist or is invalid, start with empty log
      this.usageLog = [];
    }
  }

  /**
   * Save usage log to file
   */
  private async saveUsageLog(): Promise<void> {
    await fs.writeFile(this.usageFilePath, JSON.stringify(this.usageLog, null, 2));
  }

  /**
   * Get current pricing information
   */
  getPricing(): ModelPricing {
    return { ...this.pricing };
  }
}

export const tokenTrackingService = TokenTrackingService.getInstance();