import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';
import RSS from 'rss';

const app = express();
const PORT = process.env.PORT || 3000;

function buildSearchUrl(keyword, lang, region) {
  return `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=${lang}&gl=${region}&tbm=nws&tbs=qdr:d`;
}

async function fetchNews(keyword, lang, region) {
  try {
    const { data } = await axios.get(buildSearchUrl(keyword, lang, region), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);
    const results = [];

    $('div.dbsr').each((_, el) => {
      const title = $(el).find('div.JheGif span').text();
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('div.Y3v8qd').text();
      const source = $(el).find('.XTjFC').text();
      const time = $(el).find('.WG9SHc span').last().text();
      results.push({ title, link, snippet, source, time, lang, region });
    });

    return results;
  } catch (e) {
    console.error(`Hiba a ${keyword} - ${lang}:${region} lekérésénél:`, e.message);
    return [];
  }
}

app.get('/rss', async (req, res) => {
  const keywords = (req.query.keywords || 'ai').split(',');
  const regions = [
    { lang: 'en', region: 'us' },
    { lang: 'de', region: 'de' },
    { lang: 'hu', region: 'hu' },
    { lang: 'fr', region: 'fr' }
  ];

  const feed = new RSS({
    title: 'Google News RSS',
    description: 'News RSS from Google scraped across regions and languages',
    feed_url: req.protocol + '://' + req.get('host') + req.originalUrl,
    site_url: 'https://news.google.com/',
    language: 'en'
  });

  for (const keyword of keywords) {
    for (const { lang, region } of regions) {
      const articles = await fetchNews(keyword, lang, region);
      articles.forEach(item => {
        feed.item({
          title: item.title,
          description: `${item.snippet} (${item.source})`,
          url: item.link,
          guid: item.link,
          date: new Date()
        });
      });
    }
  }

  res.set('Content-Type', 'application/rss+xml');
  res.send(feed.xml());
});

app.listen(PORT, () => console.log(`RSS API running on port ${PORT}`));
