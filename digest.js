require('dotenv').config();

const RSSParser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const parser = new RSSParser();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const FEEDS = [
  'https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml',
  'https://openai.com/news/rss.xml',
  'https://deepmind.google/blog/rss.xml',
  'https://huggingface.co/blog/feed.xml',
  'https://tldr.tech/api/rss/ai',
];

async function fetchArticles() {
  const articles = [];

  for (const url of FEEDS) {
    try {
      const feed = await Promise.race([
        parser.parseURL(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 8s')), 8000)
        )
      ]);

      const items = feed.items || [];
      const recent = items.slice(0, 3);

      if (recent.length === 0) {
        console.log(`No articles found: ${url}`);
        continue;
      }

      for (const item of recent) {
        articles.push({
          source: feed.title || url,
          title: item.title || 'No title',
          summary: item.contentSnippet || item.content || 'No summary available',
          link: item.link || '',
        });
      }

      console.log(`OK: ${feed.title} - ${recent.length} articles`);

    } catch (err) {
      console.log(`FAILED: ${url} - ${err.message}`);
    }
  }

  return articles;
}

async function summarizeWithClaude(articles) {
  const articleText = articles.map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}\n${a.summary}\nLink: ${a.link}`
  ).join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI news curator. Below are today's articles from AI industry sources.
        
Write a concise daily digest with:
1. A one-line "Top Story" if something major stands out
2. A short bullet per article (one sentence max)
3. Group bullets by source

Articles:
${articleText}`
      }
    ]
  });

  return message.content[0].text;
}

fetchArticles().then(async (articles) => {
  console.log(`Total articles fetched: ${articles.length}`);
  console.log('\nGenerating summary...\n');
  const summary = await summarizeWithClaude(articles);
  console.log(summary);
});