# AI SDK v5 Stable Upgrade Guide

## Overview

This document outlines the migration from AI SDK v5.0.0-beta.23 to the stable v5.x.x release, including breaking changes, new features, and required code updates.

## Current State Analysis

### Current AI SDK Usage
- **Version**: `ai@5.0.0-beta.23` (beta)
- **Packages**: 
  - `@ai-sdk/anthropic@2.0.0-beta.7`
  - `@ai-sdk/openai@2.0.0-beta.10` 
  - `@ai-sdk/react@2.0.0-beta.23`

### Current Implementation Files
- `src/lib/ai/providers/anthropic.ts` - Main AI provider
- AI analysis functions using `generateObject` and `generateText`
- Tool calling for structured data extraction
- Temperature and timeout configurations

## Key Changes in AI SDK v5 Stable

### Major Breaking Changes

#### 1. Tool Call Streaming (Now Default)
```typescript
// OLD (v4/v5-beta)
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
  toolCallStreaming: true, // This parameter is removed
  tools: { weatherTool },
});

// NEW (v5 stable)
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages: convertToModelMessages(messages),
  // toolCallStreaming removed - streaming is always enabled
  tools: { weatherTool },
});
```

#### 2. Tool Property Renaming (args/result → input/output)
```typescript
// OLD
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'tool-call':
      console.log('Tool args:', part.args);
      break;
    case 'tool-result':
      console.log('Tool result:', part.result);
      break;
  }
}

// NEW  
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'tool-call':
      console.log('Tool input:', part.input);
      break;
    case 'tool-result':
      console.log('Tool output:', part.output);
      break;
  }
}
```

#### 3. Tool Definition Changes (parameters → inputSchema)
```typescript
// OLD
const weatherTool = tool({
  description: 'Get the weather for a city',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return `Weather in ${city}`;
  },
});

// NEW
const weatherTool = tool({
  description: 'Get the weather for a city',
  inputSchema: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return `Weather in ${city}`;
  },
});
```

#### 4. Stream Response Changes
```typescript
// OLD
return result.toDataStreamResponse();

// NEW
return result.toUIMessageStreamResponse();
```

### Current ConvertIQ Code Impact

#### Files Requiring Updates

##### 1. `src/lib/ai/providers/anthropic.ts`

Current problematic patterns:
```typescript
// These need to be checked and potentially updated:
const result = await generateObject({
  model: this.model, // ✅ Likely OK
  system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT, // ✅ Likely OK
  prompt: generateConversionAnalysisPrompt(crawlData), // ✅ Likely OK
  schema: conversionPsychologyAnalysisSchema, // ✅ Likely OK
  temperature: 0.3, // ✅ Should be OK - core functionality
});
```

Areas to verify:
- Model initialization with `anthropic('claude-3-5-sonnet-20241022')`
- Schema validation with structured JSON responses
- Error handling and timeout mechanisms
- Response parsing and transformation

## Migration Steps

### Phase 1: Package Updates

#### 1.1 Update Package Versions
```bash
# Update to stable v5 versions
bun add ai@^5.0.0 @ai-sdk/anthropic@^2.0.0 @ai-sdk/openai@^2.0.0 @ai-sdk/react@^2.0.0

# Verify versions
bun list | grep ai-sdk
```

#### 1.2 Run AI SDK v5 Codemods
The AI SDK provides automated codemods to handle most breaking changes:

```bash
# Run all relevant v5 codemods
npx @ai-sdk/codemod v5/flatten-streamtext-file-properties
npx @ai-sdk/codemod v5/migrate-to-data-stream-protocol-v2
npx @ai-sdk/codemod v5/move-provider-options
npx @ai-sdk/codemod v5/remove-experimental-anthropic-caching
npx @ai-sdk/codemod v5/remove-experimental-anthropic-prompt-caching
```

### Phase 2: Code Updates

#### 2.1 Model Configuration Updates
```typescript
// Current (likely needs no changes)
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnthropicAnalysisProvider {
  private model = anthropic('claude-3-5-sonnet-20241022');
  // This should remain the same
}
```

#### 2.2 Tool Definition Updates (If Any)
Since ConvertIQ doesn't currently use tools heavily in the AI provider, this may not apply, but check for:
```typescript
// If any tool definitions exist, update them:
const analysisSchema = z.object({
  // schema definitions
});

// OLD (if it exists)
parameters: analysisSchema

// NEW
inputSchema: analysisSchema
```

#### 2.3 Response Handling Updates
Check if any code uses deprecated response methods:
```typescript
// Current analysis methods in anthropic.ts should be fine, but verify:
const result = await generateObject({
  model: this.model,
  system: systemPrompt,
  prompt: analysisPrompt,
  schema: analysisSchema,
  temperature: 0.3,
});

// The .object property should still work the same
return result.object;
```

#### 2.4 Stream Handling (If Used)
Currently ConvertIQ doesn't seem to use streaming for analysis, but if any streaming code exists:
```typescript
// OLD stream response
return result.toDataStreamResponse();

// NEW stream response  
return result.toUIMessageStreamResponse();
```

### Phase 3: Testing Strategy

#### 3.1 Unit Tests for AI Functions
Test each analysis function individually:
```typescript
// Test conversion psychology analysis
describe('AnthropicAnalysisProvider', () => {
  it('should analyze conversion psychology correctly', async () => {
    const provider = new AnthropicAnalysisProvider();
    const result = await provider.analyzeConversionPsychology(mockCrawlData);
    
    expect(result.analysis).toBeDefined();
    expect(result.analysis.type).toBe('conversion_psychology');
    expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
  });
  
  // Similar tests for UX and SEO analysis
});
```

#### 3.2 Integration Tests
Test the full analysis pipeline:
```typescript
// Test comprehensive analysis workflow
it('should complete comprehensive analysis with v5', async () => {
  const provider = new AnthropicAnalysisProvider();
  const result = await provider.generateComprehensiveAnalysis(mockCrawlData);
  
  expect(result.conversionPsychology).toBeDefined();
  expect(result.uxAnalysis).toBeDefined();
  expect(result.technicalSeo).toBeDefined();
  expect(result.metadata.confidence).toBeGreaterThan(0.8);
});
```

#### 3.3 Regression Testing
Ensure analysis quality hasn't degraded:
```typescript
// Compare analysis results between versions
const testUrls = [
  'https://example1.com',
  'https://example2.com',
  'https://example3.com'
];

for (const url of testUrls) {
  const v5Result = await analyzeWithV5(url);
  
  // Validate result structure
  expect(v5Result).toMatchAnalysisSchema();
  
  // Check for reasonable scores
  expect(v5Result.overallScore).toBeGreaterThanOrEqual(1);
  expect(v5Result.overallScore).toBeLessThanOrEqual(10);
}
```

### Phase 4: Performance Optimization

#### 4.1 Monitor Token Usage
v5 may have different token consumption patterns:
```typescript
// Add token usage monitoring
const result = await generateObject({
  model: this.model,
  system: systemPrompt,
  prompt: analysisPrompt,
  schema: analysisSchema,
  temperature: 0.3,
});

// Log token usage for monitoring
console.log('Token usage:', {
  promptTokens: result.usage?.promptTokens,
  completionTokens: result.usage?.completionTokens,
  totalTokens: result.usage?.totalTokens
});
```

#### 4.2 Optimize Timeout Handling
v5 may have different timeout behavior:
```typescript
// Current timeout handling in anthropic.ts
const result = await Promise.race([
  generateObject({...}),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Analysis timeout after 35s')), 35000)
  )
]);

// Verify this still works correctly with v5
```

### Phase 5: Error Handling Updates

#### 5.1 Updated Error Types
Check if v5 introduces new error types:
```typescript
try {
  const result = await generateObject({...});
  return result.object;
} catch (error) {
  // Check if new error types need handling
  if (error instanceof AISDKError) { // Hypothetical new error type
    console.error('AI SDK specific error:', error.code);
  }
  
  // Maintain existing error handling
  console.error('Analysis failed:', error);
  throw new Error(`Analysis failed: ${error.message}`);
}
```

#### 5.2 Fallback Mechanisms
Ensure fallback analysis still works:
```typescript
// Current fallback methods in anthropic.ts should remain unchanged
private createFallbackConversionAnalysis(): any {
  return {
    analysis: {
      overallScore: 5,
      keyFindings: [...],
      priorityRecommendations: [...],
      // ... rest of fallback data
    }
  };
}
```

## Implementation Checklist

### Core Updates
- [ ] Update package.json with stable v5 versions
- [ ] Run AI SDK codemods
- [ ] Test model initialization
- [ ] Verify schema validation works
- [ ] Test error handling and timeouts

### Testing
- [ ] Unit tests for all analysis functions
- [ ] Integration tests for comprehensive analysis
- [ ] Performance tests comparing v5 to beta
- [ ] Token usage monitoring
- [ ] Error scenario testing

### Monitoring
- [ ] Add logging for v5 specific metrics
- [ ] Monitor analysis quality changes
- [ ] Track token consumption changes
- [ ] Monitor API response times

### Documentation
- [ ] Update code comments referencing beta versions
- [ ] Document any new v5 specific features used
- [ ] Update CLAUDE.md with v5 information

## Expected Benefits

1. **Stability**: Move from beta to stable release
2. **Performance**: Potential improvements in processing speed
3. **Features**: Access to latest AI SDK capabilities
4. **Support**: Better community support for stable version
5. **Future-Proof**: Ensures compatibility with future updates

## Risk Assessment

### Low Risk
- ✅ Core `generateObject` functionality should remain unchanged
- ✅ Current schema-based analysis approach is well-supported
- ✅ Model configurations are straightforward

### Medium Risk  
- ⚠️ Timeout handling behavior might change slightly
- ⚠️ Token consumption patterns could differ
- ⚠️ Error messages/types might be updated

### High Risk Areas
- 🔍 Any undocumented beta features currently in use
- 🔍 Custom streaming implementations (if any)
- 🔍 Tool calling code (minimal in current codebase)

## Rollback Plan

If issues arise during v5 upgrade:
1. Revert package.json changes
2. Run `bun install` to restore beta versions  
3. Test functionality with previous versions
4. Document specific issues encountered
5. Plan targeted fixes for problematic areas

## Timeline

- **Day 1**: Package updates and codemod execution
- **Day 2**: Manual code review and adjustments
- **Day 3**: Unit testing and bug fixes
- **Day 4**: Integration testing and performance validation
- **Day 5**: Production deployment and monitoring

This upgrade should be relatively straightforward given ConvertIQ's current usage patterns focus on core AI SDK functionality that remains stable across versions.