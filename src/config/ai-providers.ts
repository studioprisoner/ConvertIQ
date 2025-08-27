import { config, type AIProvider } from './index';

export interface AIProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  costPer1kTokens: number;
  capabilities: {
    reasoning: number; // 1-10 scale
    speed: number; // 1-10 scale  
    costEfficiency: number; // 1-10 scale
    multimodal: boolean;
    functionCalling: boolean;
  };
}

export const aiProviderConfigs: Record<AIProvider, AIProviderConfig> = {
  anthropic: {
    name: 'Anthropic Claude',
    apiKey: config.ai.providers.anthropic.apiKey,
    model: config.ai.providers.anthropic.model,
    maxTokens: config.ai.providers.anthropic.maxTokens,
    costPer1kTokens: 0.008, // Approximate cost for Claude Haiku
    capabilities: {
      reasoning: 9,
      speed: 8,
      costEfficiency: 8,
      multimodal: true,
      functionCalling: true,
    },
  },
  
  ...(config.ai.providers.openai && {
    openai: {
      name: 'OpenAI GPT',
      apiKey: config.ai.providers.openai.apiKey,
      model: config.ai.providers.openai.model,
      maxTokens: config.ai.providers.openai.maxTokens,
      costPer1kTokens: 0.03, // Approximate cost for GPT-4
      capabilities: {
        reasoning: 9,
        speed: 7,
        costEfficiency: 6,
        multimodal: true,
        functionCalling: true,
      },
    } as AIProviderConfig,
  }),
  
  ...(config.ai.providers.google && {
    google: {
      name: 'Google Gemini',
      apiKey: config.ai.providers.google.apiKey,
      model: config.ai.providers.google.model,
      maxTokens: config.ai.providers.google.maxTokens,
      costPer1kTokens: 0.002, // Approximate cost for Gemini Pro
      capabilities: {
        reasoning: 8,
        speed: 9,
        costEfficiency: 9,
        multimodal: true,
        functionCalling: true,
      },
    } as AIProviderConfig,
  }),
};

export type AnalysisType = 
  | 'conversion-analysis'
  | 'seo-analysis' 
  | 'technical-analysis'
  | 'content-generation'
  | 'comprehensive-audit'
  | 'competitor-analysis';

/**
 * Select optimal AI provider based on analysis type and requirements
 */
export function selectOptimalProvider(
  analysisType: AnalysisType,
  requirements: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
    prioritizeReasoning?: boolean;
  } = {}
): AIProvider {
  const availableProviders = Object.keys(aiProviderConfigs) as AIProvider[];
  
  if (availableProviders.length === 1) {
    return availableProviders[0];
  }

  // Default provider selection based on analysis type
  const defaultSelections: Record<AnalysisType, AIProvider> = {
    'conversion-analysis': 'anthropic', // Best reasoning for psychological insights
    'seo-analysis': config.ai.providers.openai ? 'openai' : 'anthropic', // Good for structured analysis
    'technical-analysis': 'anthropic', // Strong technical reasoning
    'content-generation': config.ai.providers.google ? 'google' : 'anthropic', // Creative content
    'comprehensive-audit': 'anthropic', // Most thorough analysis
    'competitor-analysis': config.ai.providers.openai ? 'openai' : 'anthropic', // Balanced analysis
  };

  let selectedProvider = defaultSelections[analysisType];

  // Adjust based on requirements
  if (requirements.prioritizeSpeed && config.ai.providers.google) {
    selectedProvider = 'google';
  } else if (requirements.prioritizeCost && config.ai.providers.google) {
    selectedProvider = 'google';  
  } else if (requirements.prioritizeReasoning) {
    selectedProvider = 'anthropic';
  }

  // Ensure the selected provider is available
  if (!availableProviders.includes(selectedProvider)) {
    selectedProvider = availableProviders[0];
  }

  return selectedProvider;
}

/**
 * Calculate estimated cost for analysis
 */
export function calculateEstimatedCost(
  provider: AIProvider,
  estimatedTokens: number
): number {
  const providerConfig = aiProviderConfigs[provider];
  if (!providerConfig) return 0;
  
  return (estimatedTokens / 1000) * providerConfig.costPer1kTokens;
}