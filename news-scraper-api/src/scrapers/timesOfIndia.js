import { load } from 'cheerio';
import { fetchHTML } from '../utils/fetchHTML.js';
import Article from '../models/Article.js';

/**
 * Convert relative URL to absolute URL
 */
function toAbsoluteURL(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/**
 * Scrape news articles from Times of India
 * @param {object} options - Scraping options
 * @returns {Promise<Array>} - Array of scraped articles
 */
export async function scrapeTOI({ limit = 10, saveToDb = true } = {}) {
  const baseURL = 'https://timesofindia.indiatimes.com';
  const targetURL = `${baseURL}/home/headlines`;

  console.log('[scraper:toi] starting scrape...');

  try {
    // Fetch HTML content
    const html = await fetchHTML(targetURL);
    const $ = load(html);

    const articles = [];
    const seenTitles = new Set();

    // Parse articles from the page
    // Target article links with specific patterns
    $('a[href*="/articleshow/"]').each((_, element) => {
      if (articles.length >= limit) return false;

      const $el = $(element);
      const title = $el.text().trim();
      const href = $el.attr('href');

      // Skip if no title or link
      if (!title || !href || title.length < 10) return;

      // Skip duplicates
      if (seenTitles.has(title)) return;
      seenTitles.add(title);

      const link = toAbsoluteURL(href, baseURL);

      // Try to find summary or description near the link
      const $container = $el.closest('li, article, div.content');
      const summary = $container.find('p, .synopsis').first().text().trim() || null;

      // Try to extract published date
      const $timeEl = $container.find('time, .time, .date, [datetime]');
      let publishedAt = null;
      if ($timeEl.length) {
        const datetime = $timeEl.attr('datetime');
        if (datetime) {
          publishedAt = new Date(datetime);
        }
      }

      articles.push({
        title,
        summary,
        link,
        source: 'toi',
        publishedAt: publishedAt && !isNaN(publishedAt) ? publishedAt : null,
        scrapedAt: new Date()
      });
    });

    console.log(`[scraper:toi] found ${articles.length} articles`);

    // Save to database if enabled
    if (saveToDb && articles.length > 0) {
      let savedCount = 0;
      let duplicateCount = 0;

      for (const article of articles) {
        const result = await Article.saveArticle(article);
        if (result.saved) {
          savedCount++;
        } else if (result.reason === 'duplicate') {
          duplicateCount++;
        }
      }

      console.log(`[scraper:toi] saved ${savedCount} new articles, ${duplicateCount} duplicates skipped`);
    }

    return articles;

  } catch (error) {
    console.error('[scraper:toi] error:', error.message);
    throw new Error(`Failed to scrape Times of India: ${error.message}`);
  }
}
