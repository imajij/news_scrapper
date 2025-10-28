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

export async function scrapeHT({ limit = 10, saveToDb = true } = {}) {
  const baseURL = 'https://www.hindustantimes.com';
  const targetURL = `${baseURL}/india-news`;

  console.log('[scraper:ht] starting scrape...');

  try {
    const html = await fetchHTML(targetURL);
    const $ = load(html);

    const articles = [];
    const seenTitles = new Set();

    // Hindustan Times article structure
    $('div.cartHolder, div.bigStory, h3.hdg3 a, div.media-box a').each((_, element) => {
      if (articles.length >= limit) return false;

      const $el = $(element);
      const $link = $el.is('a') ? $el : $el.find('a').first();
      const href = $link.attr('href');
      const title = $link.text().trim() || $el.find('h2, h3').first().text().trim();

      if (!title || !href || title.length < 10) return;
      if (seenTitles.has(title)) return;
      seenTitles.add(title);

      const link = toAbsoluteURL(href, baseURL);
      const $container = $el.closest('div.cartHolder, div.bigStory, article');
      const summary = $container.find('p, div.sortDec').first().text().trim() || null;
      const publishedAt = $container.find('span.dateTime, time').first().text().trim() || null;

      articles.push({
        // normalize fields to pipeline/backend Article schema
        headline: title,
        title,
        summary,
        content: summary || '',
        link,
        url: link,
        publisher: 'Hindustan Times',
        source: 'ht',
        publishedAt: publishedAt || null,
        scrapedAt: new Date()
      });
    });

    console.log(`[scraper:ht] found ${articles.length} articles`);

    if (saveToDb && articles.length > 0) {
      let savedCount = 0;
      let duplicateCount = 0;

      for (const article of articles) {
        const result = await Article.saveArticle(article);
        if (result.saved) savedCount++;
        else if (result.reason === 'duplicate') duplicateCount++;
      }

      console.log(`[scraper:ht] saved ${savedCount} new articles, ${duplicateCount} duplicates skipped`);
    }

    return articles;
  } catch (error) {
    console.error('[scraper:ht] error:', error.message);
    throw new Error(`Failed to scrape Hindustan Times: ${error.message}`);
  }
}
