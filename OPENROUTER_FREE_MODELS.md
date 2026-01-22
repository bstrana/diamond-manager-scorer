# OpenRouter Free Models Guide

## Problem: 402 Insufficient Credits Error

If you see this error:
```
OpenRouter API error: 402 - Insufficient credits
```

It means the selected model requires credits (paid). You need to either:
1. **Switch to a free model** (recommended)
2. **Purchase credits** on OpenRouter

## Free Models (No Credits Required)

These models work without purchasing credits:

### Recommended Free Models

**Important**: Free models on OpenRouter require the `:free` suffix!

1. **`meta-llama/llama-3.2-3b-instruct:free`** ⭐ (Current Default)
   - Good quality
   - Fast responses
   - No credits required
   - Rate limit: ~50 requests/day (may vary)

2. **`microsoft/phi-3-mini-128k-instruct:free`**
   - Very fast
   - Good for shorter recaps
   - No credits required

3. **`qwen/qwen-2.5-7b-instruct:free`**
   - High quality
   - Good for detailed recaps
   - No credits required

4. **`google/gemini-2.0-flash-exp:free`** (if available)
   - Fast and capable
   - Good quality for game recaps
   - Check OpenRouter for current Gemini model names

## How to Change the Model

Edit `services/openRouterService.ts` and change the model name:

```typescript
body: JSON.stringify({
  model: 'meta-llama/llama-3.2-3b-instruct:free', // Change this line (note :free suffix)
  messages: messages,
  temperature: 0.7,
  max_tokens: 1000
})
```

**Important**: Free models must include the `:free` suffix!

## Models That Require Credits

These models require purchasing credits:
- ❌ `meta-llama/llama-4-maverick` (requires credits)
- ❌ `openai/gpt-4o-mini` (requires credits)
- ❌ `openai/gpt-4o` (requires credits)
- ❌ `anthropic/claude-3-opus` (requires credits)
- ❌ Most premium models

## Rate Limits on Free Models

Free models typically have:
- **Daily limit**: ~50 requests/day (without credits)
- **Solution**: Add small amount of credits ($5-10) to increase limits
- **Or**: Wait for daily reset

## Current Configuration

The app is currently set to use: **`meta-llama/llama-3.2-3b-instruct:free`** (free, no credits required)

**Note**: Free models require the `:free` suffix in the model name!

If you want to use a different free model, edit `services/openRouterService.ts` and change the model name.

---

**Need Help?** Check OpenRouter's model list: https://openrouter.ai/models
Look for models marked as "Free" or check their pricing page.

