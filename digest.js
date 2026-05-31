require('dotenv').config();

const fs = require('fs');
const path = require('path');

const RSSParser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const { marked } = require('marked');

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
  const systemPrompt = fs.readFileSync(
    path.join(__dirname, 'prompts', 'system.md'),
    'utf-8'
  );

  const articleText = articles.map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}\n${a.summary}\nLink: ${a.link}`
  ).join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Here are today's articles. Please generate my daily briefing.\n\n${articleText}`
      }
    ]
  });

  return message.content[0].text;
}

function saveAsHTML(content) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Digest - ${date}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { font-size: 1.4rem; color: #555; font-weight: normal; }
    h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-top: 2rem; }
    a { color: #0070f3; }
    strong { color: #111; }
    hr { border: none; border-top: 1px solid #eee; margin: 2rem 0; }
  </style>
</head>
<body>
  <h1>AI Daily Digest — ${date}</h1>
  <div id="content">${marked.parse(content)}</div>
</body>
</html>`;

  const filename = path.join(__dirname, 'briefs', `digest-${new Date().toISOString().split('T')[0]}.html`);
  fs.writeFileSync(filename, html, 'utf-8');
  console.log(`\nSaved to: ${filename}`);
  return filename;
}

async function sendEmail(htmlContent, date) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `AI Digest <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    cc: process.env.EMAIL_CC,
    subject: `AI Daily Digest — ${date}`,
    html: htmlContent,
  });

  console.log('Email sent successfully');
}

fetchArticles().then(async (articles) => {
  console.log(`Total articles fetched: ${articles.length}`);
  console.log('\nGenerating summary...\n');
  const summary = await summarizeWithClaude(articles);
  console.log(summary);
  const filename = saveAsHTML(summary);
  const htmlContent = fs.readFileSync(filename, 'utf-8');
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  await sendEmail(htmlContent, date);
});