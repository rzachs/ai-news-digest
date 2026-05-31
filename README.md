# AI News Digest

A Node.js script that fetches the latest AI news from RSS feeds and generates a daily summary using the Claude API.

## Sources
- Anthropic News
- OpenAI News
- Google DeepMind
- Hugging Face Blog
- TLDR AI

## Setup

1. Clone the repo
2. Run `npm install`
3. Create a `.env` file with your Anthropic API key:

ANTHROPIC_API_KEY=your-key-here

4. Run the script:

node digest.js

## Requirements
- Node.js v18+
- Anthropic API key from https://console.anthropic.com