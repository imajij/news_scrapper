import { load } from 'cheerio';
import { fetchHTML } from '../utils/fetchHTML.js';
import Article from '../models/Article.js';

function toAbsoluteURL(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export async function scrapeGuardian({ limit = 10, saveToDb = true } = {}) {
  const baseURL = 'https://www.theguardian.com';
  const targetURL = `${baseURL}/international`;

  console.log('[scraper:guardian] starting scrape...');

  try {
    const html = await fetchHTML(targetURL);
    const $ = load(html);

    const articles = [];
    const seenTitles = new Set();

    $('a[data-link-name="article"]').each((_, element) => {
      if (articles.length >= limit) return false;

      const $el = $(element);
      const title = $el.find('span').text().trim() || $el.text().trim();
      const href = $el.attr('href');

      if (!title || !href || title.length < 10) return;
      if (seenTitles.has(title)) return;
      seenTitles.add(title);

      const link = toAbsoluteURL(href, baseURL);
      const $container = $el.closest('li, article, div');
      const summary = $container.find('p').first().text().trim() || null;

      articles.push({
        title,
        summary,
        link,
        source: 'guardian',
        publishedAt: null,
        scrapedAt: new Date()
      });
    });

    console.log(`[scraper:guardian] found ${articles.length} articles`);

    if (saveToDb && articles.length > 0) {
      let savedCount = 0;
      let duplicateCount = 0;

      for (const article of articles) {
        const result = await Article.saveArticle(article);
        if (result.saved) savedCount++;
        else if (result.reason === 'duplicate') duplicateCount++;
      }

      console.log(`[scraper:guardian] saved ${savedCount} new articles, ${duplicateCount} duplicates skipped`);
    }

    return articles;
  } catch (error) {
    console.error('[scraper:guardian] error:', error.message);
    throw new Error(`Failed to scrape The Guardian: ${error.message}`);
  }
}
