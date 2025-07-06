/**
 * RecommendationEngine - AI-powered optimization suggestions and insights
 */

import { TransportType } from '../devpipe/transports/DevPipeTransport';
import { EnvironmentDetector } from '../utils/EnvironmentDetector';

export interface RecommendationContext {
  userId?: string;
  sessionId: string;
  timestamp: Date;
  currentTransport: TransportType;
  availableTransports: TransportType[];
  performanceMetrics: PerformanceSnapshot;
  userBehavior: UserBehaviorPattern;
  environmentContext: EnvironmentContext;
}

export interface PerformanceSnapshot {
  averageLatency: number;
  errorRate: number;
  throughput: number;
  reliability: number;
  transportUsage: Record<TransportType, number>;
  timeWindow: string; // e.g., '1h', '24h', '7d'
}

export interface UserBehaviorPattern {
  usageFrequency: 'low' | 'medium' | 'high';
  peakUsageHours: number[];
  preferredFeatures: string[];
  errorTolerance: 'low' | 'medium' | 'high';
  performanceSensitivity: 'low' | 'medium' | 'high';
}

export interface EnvironmentContext {
  platform: string;
  connectivity: 'poor' | 'fair' | 'good' | 'excellent';
  bandwidth: number; // Mbps
  latency: number; // ms
  stability: number; // 0-1
}

export enum RecommendationType {
  TRANSPORT_OPTIMIZATION = 'transport_optimization',
  PERFORMANCE_TUNING = 'performance_tuning',
  ERROR_REDUCTION = 'error_reduction',
  COST_OPTIMIZATION = 'cost_optimization',
  FEATURE_ADOPTION = 'feature_adoption',
  CONFIGURATION_IMPROVEMENT = 'configuration_improvement',
  PROACTIVE_MAINTENANCE = 'proactive_maintenance'
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  
  // Expected impact
  expectedImpact: {
    performanceImprovement: number; // percentage
    errorReduction: number; // percentage
    reliabilityImprovement: number; // percentage
    confidenceScore: number; // 0-1
  };
  
  // Implementation details
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    steps: RecommendationStep[];
    reversible: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  // Metadata
  category: string;
  tags: string[];
  created: Date;
  validUntil?: Date;
  appliedAt?: Date;
  effectiveness?: number; // post-implementation feedback
}

export interface RecommendationStep {
  id: string;
  title: string;
  description: string;
  action: 'manual' | 'automatic';
  command?: string;
  validation?: string;
  dependencies?: string[];
}

export interface OptimizationOpportunity {
  area: 'transport' | 'configuration' | 'usage' | 'environment';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  description: string;
  metrics: {
    currentValue: number;
    potentialValue: number;
    improvement: number;
  };
}

export interface InsightCategory {
  name: string;
  description: string;
  priority: number;
  insights: Insight[];
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
  confidence: number; // 0-1
  data: any;
  actionable: boolean;
  related: string[]; // related recommendation IDs
}

export interface PredictiveAlert {
  id: string;
  type: 'performance_degradation' | 'transport_failure' | 'capacity_limit' | 'maintenance_required';
  severity: 'info' | 'warning' | 'error' | 'critical';
  probability: number; // 0-1
  timeframe: string; // e.g., '1h', '24h', '1w'
  description: string;
  preventiveActions: Recommendation[];
  triggers: string[];
}

export class RecommendationEngine {
  private performanceHistory: PerformanceSnapshot[] = [];
  private behaviorPatterns: Map<string, UserBehaviorPattern> = new Map();
  private appliedRecommendations: Map<string, Recommendation> = new Map();
  private insightCache: Map<string, InsightCategory[]> = new Map();
  private predictionModels: Map<string, any> = new Map();

  private readonly ANALYSIS_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MIN_DATA_POINTS = 10;
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor() {
    this.initializePredictionModels();
  }

  /**
   * Generate comprehensive recommendations based on current context
   */
  async generateRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Analyze current performance and identify opportunities
      const opportunities = await this.analyzeOptimizationOpportunities(context);
      
      // Generate transport-specific recommendations
      const transportRecs = await this.generateTransportRecommendations(context, opportunities);
      recommendations.push(...transportRecs);

      // Generate performance tuning recommendations
      const performanceRecs = await this.generatePerformanceRecommendations(context, opportunities);
      recommendations.push(...performanceRecs);

      // Generate configuration recommendations
      const configRecs = await this.generateConfigurationRecommendations(context);
      recommendations.push(...configRecs);

      // Generate proactive maintenance recommendations
      const maintenanceRecs = await this.generateMaintenanceRecommendations(context);
      recommendations.push(...maintenanceRecs);

      // Sort by priority and expected impact
      const sortedRecommendations = this.prioritizeRecommendations(recommendations);

      // Cache recommendations for tracking
      sortedRecommendations.forEach(rec => {
        this.appliedRecommendations.set(rec.id, rec);
      });

      return sortedRecommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze current state to identify optimization opportunities
   */
  private async analyzeOptimizationOpportunities(context: RecommendationContext): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze transport performance
    if (context.performanceMetrics.errorRate > 0.05) {
      opportunities.push({
        area: 'transport',
        impact: 'high',
        effort: 'medium',
        description: 'High error rate detected, transport optimization recommended',
        metrics: {
          currentValue: context.performanceMetrics.errorRate,
          potentialValue: 0.01,
          improvement: (context.performanceMetrics.errorRate - 0.01) / context.performanceMetrics.errorRate
        }
      });
    }

    // Analyze latency issues
    if (context.performanceMetrics.averageLatency > 500) {
      opportunities.push({
        area: 'configuration',
        impact: 'medium',
        effort: 'low',
        description: 'High latency detected, configuration tuning recommended',
        metrics: {
          currentValue: context.performanceMetrics.averageLatency,
          potentialValue: 200,
          improvement: (context.performanceMetrics.averageLatency - 200) / context.performanceMetrics.averageLatency
        }
      });
    }

    // Analyze transport usage patterns
    const transportDistribution = Object.values(context.performanceMetrics.transportUsage);
    const maxUsage = Math.max(...transportDistribution);
    const minUsage = Math.min(...transportDistribution);
    
    if (maxUsage / (minUsage || 0.001) > 10) {
      opportunities.push({
        area: 'usage',
        impact: 'medium',
        effort: 'low',
        description: 'Unbalanced transport usage detected, load balancing recommended',
        metrics: {
          currentValue: maxUsage / (minUsage || 0.001),
          potentialValue: 3,
          improvement: 0.3
        }
      });
    }

    return opportunities;
  }

  /**
   * Generate transport-specific recommendations
   */
  private async generateTransportRecommendations(
    context: RecommendationContext,
    opportunities: OptimizationOpportunity[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check if current transport is optimal
    const optimalTransport = await this.determineOptimalTransport(context);
    if (optimalTransport !== context.currentTransport) {
      recommendations.push({
        id: `transport-switch-${Date.now()}`,
        type: RecommendationType.TRANSPORT_OPTIMIZATION,
        priority: 'high',
        title: `Switch to ${optimalTransport} Transport`,
        description: `Based on your usage patterns and environment, ${optimalTransport} transport would provide better performance.`,
        rationale: this.generateTransportSwitchRationale(context, optimalTransport),
        expectedImpact: {
          performanceImprovement: 25,
          errorReduction: 40,
          reliabilityImprovement: 30,
          confidenceScore: 0.85
        },
        implementation: {
          difficulty: 'easy',
          estimatedTime: '1 minute',
          steps: [
            {
              id: 'switch-transport',
              title: 'Switch Primary Transport',
              description: `Change primary transport to ${optimalTransport}`,
              action: 'automatic'
            }
          ],
          reversible: true,
          riskLevel: 'low'
        },
        category: 'Transport',
        tags: ['performance', 'optimization', 'transport'],
        created: new Date()
      });
    }

    // Check for transport fallback improvements
    if (context.performanceMetrics.errorRate > 0.02) {
      recommendations.push({
        id: `fallback-optimization-${Date.now()}`,
        type: RecommendationType.TRANSPORT_OPTIMIZATION,
        priority: 'medium',
        title: 'Optimize Transport Fallback Chain',
        description: 'Configure intelligent fallback to reduce error impact.',
        rationale: 'Current error rate suggests fallback mechanisms could be improved.',
        expectedImpact: {
          performanceImprovement: 15,
          errorReduction: 60,
          reliabilityImprovement: 45,
          confidenceScore: 0.75
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: '5 minutes',
          steps: [
            {
              id: 'configure-fallback',
              title: 'Configure Fallback Chain',
              description: 'Set up intelligent transport fallback',
              action: 'manual'
            }
          ],
          reversible: true,
          riskLevel: 'low'
        },
        category: 'Reliability',
        tags: ['fallback', 'reliability', 'error-reduction'],
        created: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate performance tuning recommendations
   */
  private async generatePerformanceRecommendations(
    context: RecommendationContext,
    opportunities: OptimizationOpportunity[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for timeout optimization
    if (context.performanceMetrics.averageLatency > 1000) {
      recommendations.push({
        id: `timeout-optimization-${Date.now()}`,
        type: RecommendationType.PERFORMANCE_TUNING,
        priority: 'medium',
        title: 'Optimize Request Timeouts',
        description: 'Adjust timeout settings to reduce wait times for failed requests.',
        rationale: 'High average latency indicates timeout settings may need adjustment.',
        expectedImpact: {
          performanceImprovement: 20,
          errorReduction: 10,
          reliabilityImprovement: 15,
          confidenceScore: 0.8
        },
        implementation: {
          difficulty: 'easy',
          estimatedTime: '2 minutes',
          steps: [
            {
              id: 'adjust-timeouts',
              title: 'Adjust Timeout Settings',
              description: 'Optimize request timeout values',
              action: 'manual'
            }
          ],
          reversible: true,
          riskLevel: 'low'
        },
        category: 'Performance',
        tags: ['timeout', 'latency', 'performance'],
        created: new Date()
      });
    }

    // Check for connection pooling opportunities
    if (context.performanceMetrics.throughput < 100) {
      recommendations.push({
        id: `connection-pooling-${Date.now()}`,
        type: RecommendationType.PERFORMANCE_TUNING,
        priority: 'high',
        title: 'Enable Connection Pooling',
        description: 'Enable connection pooling to improve throughput and reduce connection overhead.',
        rationale: 'Low throughput suggests connection pooling could provide significant benefits.',
        expectedImpact: {
          performanceImprovement: 40,
          errorReduction: 20,
          reliabilityImprovement: 25,
          confidenceScore: 0.9
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: '3 minutes',
          steps: [
            {
              id: 'enable-pooling',
              title: 'Enable Connection Pooling',
              description: 'Configure HTTP connection pooling',
              action: 'automatic'
            }
          ],
          reversible: true,
          riskLevel: 'low'
        },
        category: 'Performance',
        tags: ['connection-pooling', 'throughput', 'performance'],
        created: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate configuration recommendations
   */
  private async generateConfigurationRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for retry configuration
    if (context.performanceMetrics.errorRate > 0.03) {
      recommendations.push({
        id: `retry-config-${Date.now()}`,
        type: RecommendationType.CONFIGURATION_IMPROVEMENT,
        priority: 'medium',
        title: 'Optimize Retry Configuration',
        description: 'Fine-tune retry attempts and backoff strategy to handle transient errors better.',
        rationale: 'Error rate suggests retry configuration could be optimized.',
        expectedImpact: {
          performanceImprovement: 10,
          errorReduction: 35,
          reliabilityImprovement: 40,
          confidenceScore: 0.75
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: '5 minutes',
          steps: [
            {
              id: 'configure-retry',
              title: 'Configure Retry Strategy',
              description: 'Set up exponential backoff retry strategy',
              action: 'manual'
            }
          ],
          reversible: true,
          riskLevel: 'low'
        },
        category: 'Configuration',
        tags: ['retry', 'error-handling', 'reliability'],
        created: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate proactive maintenance recommendations
   */
  private async generateMaintenanceRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for health monitoring optimization
    const healthMonitoringRecommendation: Recommendation = {
      id: `health-monitoring-${Date.now()}`,
      type: RecommendationType.PROACTIVE_MAINTENANCE,
      priority: 'low',
      title: 'Enhance Health Monitoring',
      description: 'Set up comprehensive health monitoring to detect issues early.',
      rationale: 'Proactive monitoring can prevent issues before they impact users.',
      expectedImpact: {
        performanceImprovement: 5,
        errorReduction: 25,
        reliabilityImprovement: 35,
        confidenceScore: 0.8
      },
      implementation: {
        difficulty: 'easy',
        estimatedTime: '2 minutes',
        steps: [
          {
            id: 'enable-monitoring',
            title: 'Enable Enhanced Monitoring',
            description: 'Turn on comprehensive health monitoring',
            action: 'automatic'
          }
        ],
        reversible: true,
        riskLevel: 'low'
      },
      category: 'Maintenance',
      tags: ['monitoring', 'proactive', 'health'],
      created: new Date()
    };

    recommendations.push(healthMonitoringRecommendation);

    return recommendations;
  }

  /**
   * Determine optimal transport based on context
   */
  private async determineOptimalTransport(context: RecommendationContext): Promise<TransportType> {
    const environment = context.environmentContext;
    const behavior = context.userBehavior;
    
    // Score each available transport
    const scores: Record<TransportType, number> = {} as Record<TransportType, number>;
    
    for (const transport of context.availableTransports) {
      let score = 0;
      
      switch (transport) {
        case TransportType.WEBSOCKET:
          // WebSocket is great for real-time, low latency needs
          score += environment.connectivity === 'excellent' ? 40 : 20;
          score += environment.latency < 50 ? 30 : 10;
          score += behavior.performanceSensitivity === 'high' ? 20 : 10;
          score += behavior.usageFrequency === 'high' ? 10 : 0;
          break;
          
        case TransportType.HTTP:
          // HTTP is reliable and widely compatible
          score += 30; // Base reliability score
          score += environment.connectivity === 'poor' ? 20 : 10;
          score += behavior.errorTolerance === 'low' ? 20 : 10;
          score += 15; // Wide compatibility bonus
          break;
          
        case TransportType.FILESYSTEM:
          // FileSystem is good for offline scenarios
          score += environment.connectivity === 'poor' ? 40 : 5;
          score += behavior.usageFrequency === 'low' ? 20 : 0;
          score += 10; // Offline capability bonus
          break;
      }
      
      scores[transport] = score;
    }
    
    // Return transport with highest score
    return Object.entries(scores).reduce((a, b) => scores[a[0] as TransportType] > scores[b[0] as TransportType] ? a : b)[0] as TransportType;
  }

  /**
   * Generate rationale for transport switch recommendation
   */
  private generateTransportSwitchRationale(context: RecommendationContext, recommendedTransport: TransportType): string {
    const current = context.currentTransport;
    const env = context.environmentContext;
    
    let rationale = `Switching from ${current} to ${recommendedTransport} is recommended because: `;
    
    switch (recommendedTransport) {
      case TransportType.WEBSOCKET:
        rationale += 'WebSocket provides real-time communication with lower latency, ';
        if (env.connectivity === 'excellent') {
          rationale += 'and your excellent connectivity supports stable WebSocket connections.';
        } else {
          rationale += 'which would benefit your usage patterns.';
        }
        break;
        
      case TransportType.HTTP:
        rationale += 'HTTP offers superior reliability and error handling, ';
        if (context.performanceMetrics.errorRate > 0.05) {
          rationale += 'which is especially important given your current error rate.';
        } else {
          rationale += 'providing a more stable foundation for your usage.';
        }
        break;
        
      case TransportType.FILESYSTEM:
        rationale += 'FileSystem transport provides offline capability and local storage benefits, ';
        if (env.connectivity === 'poor') {
          rationale += 'which is ideal for your current connectivity situation.';
        } else {
          rationale += 'offering better performance for your usage patterns.';
        }
        break;
    }
    
    return rationale;
  }

  /**
   * Prioritize recommendations by impact and feasibility
   */
  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.sort((a, b) => {
      // First, sort by priority
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by expected impact score (combination of performance and confidence)
      const impactA = a.expectedImpact.performanceImprovement * a.expectedImpact.confidenceScore;
      const impactB = b.expectedImpact.performanceImprovement * b.expectedImpact.confidenceScore;
      return impactB - impactA;
    });
  }

  /**
   * Generate insights from current performance data
   */
  async generateInsights(context: RecommendationContext): Promise<InsightCategory[]> {
    const cacheKey = this.generateInsightCacheKey(context);
    
    // Check cache first
    if (this.insightCache.has(cacheKey)) {
      const cached = this.insightCache.get(cacheKey)!;
      // Return cached insights if less than 10 minutes old
      if (Date.now() - cached[0]?.insights[0]?.data?.timestamp < 10 * 60 * 1000) {
        return cached;
      }
    }
    
    const insights: InsightCategory[] = [];
    
    // Performance insights
    const performanceInsights = await this.generatePerformanceInsights(context);
    insights.push({
      name: 'Performance',
      description: 'Current performance analysis and trends',
      priority: 1,
      insights: performanceInsights
    });
    
    // Usage insights
    const usageInsights = await this.generateUsageInsights(context);
    insights.push({
      name: 'Usage Patterns',
      description: 'Analysis of your usage patterns and behavior',
      priority: 2,
      insights: usageInsights
    });
    
    // Transport insights
    const transportInsights = await this.generateTransportInsights(context);
    insights.push({
      name: 'Transport Analysis',
      description: 'Transport performance and optimization opportunities',
      priority: 3,
      insights: transportInsights
    });
    
    // Cache insights
    this.insightCache.set(cacheKey, insights);
    
    return insights;
  }

  /**
   * Generate performance-related insights
   */
  private async generatePerformanceInsights(context: RecommendationContext): Promise<Insight[]> {
    const insights: Insight[] = [];
    const metrics = context.performanceMetrics;
    
    // Latency insight
    if (metrics.averageLatency < 200) {
      insights.push({
        id: 'low-latency',
        title: 'Excellent Response Time',
        description: `Your average response time of ${metrics.averageLatency}ms is excellent.`,
        type: 'positive',
        confidence: 0.9,
        data: { latency: metrics.averageLatency, timestamp: Date.now() },
        actionable: false,
        related: []
      });
    } else if (metrics.averageLatency > 500) {
      insights.push({
        id: 'high-latency',
        title: 'High Response Time Detected',
        description: `Your average response time of ${metrics.averageLatency}ms could be improved.`,
        type: 'warning',
        confidence: 0.85,
        data: { latency: metrics.averageLatency, timestamp: Date.now() },
        actionable: true,
        related: []
      });
    }
    
    // Error rate insight
    if (metrics.errorRate < 0.01) {
      insights.push({
        id: 'low-error-rate',
        title: 'Low Error Rate',
        description: `Your error rate of ${(metrics.errorRate * 100).toFixed(2)}% is very good.`,
        type: 'positive',
        confidence: 0.9,
        data: { errorRate: metrics.errorRate, timestamp: Date.now() },
        actionable: false,
        related: []
      });
    } else if (metrics.errorRate > 0.05) {
      insights.push({
        id: 'high-error-rate',
        title: 'High Error Rate',
        description: `Your error rate of ${(metrics.errorRate * 100).toFixed(2)}% needs attention.`,
        type: 'critical',
        confidence: 0.95,
        data: { errorRate: metrics.errorRate, timestamp: Date.now() },
        actionable: true,
        related: []
      });
    }
    
    return insights;
  }

  /**
   * Generate usage pattern insights
   */
  private async generateUsageInsights(context: RecommendationContext): Promise<Insight[]> {
    const insights: Insight[] = [];
    const behavior = context.userBehavior;
    
    // Usage frequency insight
    insights.push({
      id: 'usage-frequency',
      title: 'Usage Pattern Analysis',
      description: `Your usage frequency is ${behavior.usageFrequency}. ${this.getUsageFrequencyAdvice(behavior.usageFrequency)}`,
      type: 'neutral',
      confidence: 0.8,
      data: { frequency: behavior.usageFrequency, timestamp: Date.now() },
      actionable: behavior.usageFrequency !== 'medium',
      related: []
    });
    
    // Peak usage insight
    if (behavior.peakUsageHours.length > 0) {
      insights.push({
        id: 'peak-usage',
        title: 'Peak Usage Hours',
        description: `Your peak usage occurs during hours: ${behavior.peakUsageHours.join(', ')}. Consider optimizing for these times.`,
        type: 'neutral',
        confidence: 0.7,
        data: { peakHours: behavior.peakUsageHours, timestamp: Date.now() },
        actionable: true,
        related: []
      });
    }
    
    return insights;
  }

  /**
   * Generate transport-specific insights
   */
  private async generateTransportInsights(context: RecommendationContext): Promise<Insight[]> {
    const insights: Insight[] = [];
    const usage = context.performanceMetrics.transportUsage;
    
    // Transport distribution insight
    const totalUsage = Object.values(usage).reduce((sum, val) => sum + val, 0);
    const dominantTransport = Object.entries(usage).reduce((a, b) => usage[a[0] as TransportType] > usage[b[0] as TransportType] ? a : b);
    
    if (totalUsage > 0) {
      const dominantPercentage = (usage[dominantTransport[0] as TransportType] / totalUsage * 100);
      
      if (dominantPercentage > 80) {
        insights.push({
          id: 'transport-concentration',
          title: 'Heavy Reliance on Single Transport',
          description: `You're using ${dominantTransport[0]} for ${dominantPercentage.toFixed(1)}% of requests. Consider load balancing.`,
          type: 'warning',
          confidence: 0.8,
          data: { distribution: usage, dominant: dominantTransport[0], timestamp: Date.now() },
          actionable: true,
          related: []
        });
      } else {
        insights.push({
          id: 'balanced-transport-usage',
          title: 'Good Transport Distribution',
          description: 'Your transport usage is well balanced across available options.',
          type: 'positive',
          confidence: 0.75,
          data: { distribution: usage, timestamp: Date.now() },
          actionable: false,
          related: []
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate predictive alerts for potential issues
   */
  async generatePredictiveAlerts(context: RecommendationContext): Promise<PredictiveAlert[]> {
    const alerts: PredictiveAlert[] = [];
    
    // Predict performance degradation
    const performanceTrend = this.analyzePerformanceTrend(context);
    if (performanceTrend.declining && performanceTrend.severity > 0.7) {
      alerts.push({
        id: `perf-degradation-${Date.now()}`,
        type: 'performance_degradation',
        severity: 'warning',
        probability: performanceTrend.severity,
        timeframe: '24h',
        description: 'Performance degradation trend detected. Response times may increase significantly.',
        preventiveActions: [],
        triggers: ['increasing_latency', 'error_rate_rise']
      });
    }
    
    // Predict transport failure
    if (context.performanceMetrics.errorRate > 0.1) {
      alerts.push({
        id: `transport-failure-${Date.now()}`,
        type: 'transport_failure',
        severity: 'error',
        probability: Math.min(context.performanceMetrics.errorRate * 2, 0.9),
        timeframe: '1h',
        description: `${context.currentTransport} transport showing high error rate. Failure risk is elevated.`,
        preventiveActions: [],
        triggers: ['high_error_rate', 'connection_instability']
      });
    }
    
    return alerts;
  }

  /**
   * Analyze performance trend from historical data
   */
  private analyzePerformanceTrend(context: RecommendationContext): { declining: boolean; severity: number } {
    // Simulate trend analysis - in real implementation, this would analyze historical data
    const recentLatency = context.performanceMetrics.averageLatency;
    const recentErrorRate = context.performanceMetrics.errorRate;
    
    // Simple heuristic for trend analysis
    const latencyScore = Math.min(recentLatency / 1000, 1); // Normalize to 0-1
    const errorScore = Math.min(recentErrorRate * 10, 1); // Normalize to 0-1
    
    const severity = (latencyScore + errorScore) / 2;
    
    return {
      declining: severity > 0.5,
      severity: severity
    };
  }

  /**
   * Get advice based on usage frequency
   */
  private getUsageFrequencyAdvice(frequency: string): string {
    switch (frequency) {
      case 'low':
        return 'Consider using FileSystem transport for better offline capability.';
      case 'high':
        return 'WebSocket transport might provide better performance for your intensive usage.';
      default:
        return 'Your current configuration should work well for your usage patterns.';
    }
  }

  /**
   * Generate cache key for insights
   */
  private generateInsightCacheKey(context: RecommendationContext): string {
    return `insights-${context.sessionId}-${context.currentTransport}-${Math.floor(Date.now() / (10 * 60 * 1000))}`;
  }

  /**
   * Initialize prediction models (placeholder for future ML models)
   */
  private initializePredictionModels(): void {
    // Placeholder for future machine learning model initialization
    this.predictionModels.set('performance_trend', {
      type: 'linear_regression',
      features: ['latency', 'error_rate', 'throughput'],
      trained: false
    });
    
    this.predictionModels.set('failure_prediction', {
      type: 'classification',
      features: ['error_rate', 'latency_variance', 'connection_failures'],
      trained: false
    });
  }

  /**
   * Track recommendation effectiveness (called after implementation)
   */
  trackRecommendationEffectiveness(recommendationId: string, effectiveness: number): void {
    const recommendation = this.appliedRecommendations.get(recommendationId);
    if (recommendation) {
      recommendation.effectiveness = effectiveness;
      recommendation.appliedAt = new Date();
      
      // Update prediction models based on feedback (future enhancement)
      console.log(`Recommendation ${recommendationId} effectiveness: ${effectiveness}`);
    }
  }

  /**
   * Get recommendation statistics
   */
  getRecommendationStats(): {
    total: number;
    applied: number;
    averageEffectiveness: number;
    byType: Record<RecommendationType, number>;
  } {
    const applied = Array.from(this.appliedRecommendations.values()).filter(r => r.appliedAt);
    const effectiveness = applied.filter(r => r.effectiveness !== undefined);
    
    const byType: Record<RecommendationType, number> = {} as Record<RecommendationType, number>;
    applied.forEach(rec => {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
    });
    
    return {
      total: this.appliedRecommendations.size,
      applied: applied.length,
      averageEffectiveness: effectiveness.length > 0 
        ? effectiveness.reduce((sum, r) => sum + (r.effectiveness || 0), 0) / effectiveness.length 
        : 0,
      byType
    };
  }
}
