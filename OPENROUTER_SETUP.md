# OpenRouter AI Integration for Game Recaps

## Overview

The Baseball Scoreboard app now includes AI-powered game recap generation using OpenRouter. This allows you to generate engaging, narrative-style game recaps automatically after a game ends.

**✨ Using Free Models**: The app is configured to use **free AI models** by default (`google/gemini-flash-1.5`), so there's **no cost per recap**!

## Features

- **AI-Powered Recaps**: Generate professional, engaging game recaps using AI
- **Toggle Between Modes**: Switch between basic summary and AI recap
- **Automatic Generation**: Option to auto-generate AI recap when enabled
- **Error Handling**: Graceful fallback if AI generation fails

## Setup

### 1. Get OpenRouter API Key

1. **Sign up at OpenRouter**: https://openrouter.ai/
2. **Create an API Key**:
   - Go to your dashboard
   - Navigate to "Keys" section
   - Click "Create Key"
   - Copy your API key

### 2. Configure Environment Variables

#### For Local Development

Add to your `.env.local` file:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

#### For Production (Cloudron)

Add the environment variables in Cloudron dashboard:

1. Go to your app settings
2. Navigate to "Environment Variables"
3. Add:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key
   - **Key**: `OPENROUTER_MODEL` (optional)
   - **Value**: Model name (e.g., `mistralai/mistral-7b-instruct:free`)

Or add to `/app/data/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

**Note**: If `OPENROUTER_MODEL` is not set, it defaults to `mistralai/mistral-7b-instruct:free`

### 3. Restart the Application

After setting the environment variable, restart your application:

- **Local**: Stop and restart `npm run dev`
- **Cloudron**: Restart the app from Cloudron dashboard

## Usage

### Generating an AI Recap

1. **End a game** (mark it as final)
2. **Open Game Summary** modal
3. **Toggle "AI Recap"** checkbox, or click **"Generate AI Recap"** button
4. **Wait for generation** (usually takes 5-10 seconds)
5. **Copy or use** the generated recap

### Features

- **Basic Summary**: Quick, structured summary with stats (default)
- **AI Recap**: Engaging narrative-style recap (when enabled)
- **Toggle**: Switch between modes anytime
- **Copy to Clipboard**: Easy sharing of recaps

## AI Model Configuration

The app uses `mistralai/mistral-7b-instruct:free` by default (free and fast). 

### Changing the Model

You can change the model via environment variable (recommended) or by editing the code:

#### Option 1: Environment Variable (Recommended)

Set `OPENROUTER_MODEL` in your `.env.local` or Cloudron environment variables:

```env
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

#### Option 2: Edit Code

Edit `services/openRouterService.ts` and change the default fallback:

```typescript
const model = getEnvVar('OPENROUTER_MODEL') || 'mistralai/mistral-7b-instruct:free';
```

### Recommended Free Models

- **Default (Free)**: `google/gemini-flash-1.5` - Fast, capable, and free
- **Alternative Free**: `meta-llama/llama-3.2-3b-instruct` - Good quality, free
- **Alternative Free**: `microsoft/phi-3-mini-128k-instruct` - Fast, free

### Paid Models (if you want better quality)

- **Cost-Effective**: `openai/gpt-4o-mini`
- **Better Quality**: `openai/gpt-4o`
- **Fast & Cheap**: `anthropic/claude-3-haiku`
- **Best Quality**: `anthropic/claude-3-opus`

## Cost Considerations

The default model (`google/gemini-flash-1.5`) is **FREE**:
- **Typical recap**: ~500-800 tokens
- **Cost**: $0.00 per recap (free tier)
- **No monthly costs** for free models

**Note**: Free models may have rate limits. If you exceed limits, consider upgrading to a paid model or waiting for rate limit reset.

## Troubleshooting

### "OpenRouter API key is not configured"

- Check that `OPENROUTER_API_KEY` is set in your environment variables
- Restart the application after setting the variable
- Verify the key is correct (starts with `sk-or-v1-`)

### "Failed to generate AI recap"

- Check your OpenRouter account has credits
- Verify your API key is valid
- Check browser console for detailed error messages
- Ensure you have internet connectivity

### Slow Generation

- AI generation typically takes 5-15 seconds
- If consistently slow, try a faster model (e.g., `claude-3-haiku`)
- Check your internet connection

### API Errors

- **401 Unauthorized**: Invalid API key
- **429 Too Many Requests**: Rate limit exceeded (wait a moment)
- **500 Server Error**: OpenRouter service issue (try again later)

## Customization

### Adjusting Recap Style

Edit the system prompt in `services/openRouterService.ts`:

```typescript
const systemPrompt = `You are a professional sports writer...`;
```

### Changing Recap Length

Modify `max_tokens` in the API call:

```typescript
max_tokens: 1000 // Increase for longer recaps, decrease for shorter
```

### Adjusting Creativity

Modify `temperature`:

```typescript
temperature: 0.7 // 0.0 = more factual, 1.0 = more creative
```

## Security Notes

- API keys are injected client-side (required for OpenRouter API)
- Keys are visible in browser DevTools
- Consider using a proxy/backend if you need to hide the key
- Use OpenRouter's usage limits to control costs

## Example Output

**Basic Summary:**
```
⚾️ **Game Summary** ⚾️

**FINAL:** Home Team def. Away Team, 5-3
*Championship* at *Main Field*
Duration: 2h 15m

**WP:** John Smith (#10)
**LP:** Mike Johnson (#5)

**Top Hitters:**
- Player A (Hom): 3 hits
- Player B (Awa): 2 hits
```

**AI Recap:**
```
In an exciting matchup at Main Field, the Home Team secured a 5-3 victory over the Away Team in a tightly contested championship game that lasted 2 hours and 15 minutes.

The game featured standout performances from both teams, with Player A leading the charge for the Home Team with 3 hits, while Player B contributed 2 hits for the Away Team. The winning pitcher, John Smith (#10), delivered a solid performance on the mound...

[Continues with engaging narrative]
```

---

**Need Help?** Check the browser console for detailed error messages or contact OpenRouter support for API-related issues.

