import { load } from 'cheerio';
import { fetchHTML } from '../utils/fetchHTML.js';

function absolute(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

// Static scraper (cheerio): BBC
export async function scrapeBBC({ limit = 10 } = {}) {
  const base = 'https://www.bbc.com';
  const url = `${base}/news`;
  const html = await fetchHTML(url);
  const $ = load(html);

  // Select promos
  const articles = [];
  $('a.gs-c-promo-heading').each((_, el) => {
    if (articles.length >= limit) return false;
    const $el = $(el);
    const title = $el.text().trim();
    const link = absolute($el.attr('href') || '', base);
    if (!title || !link) return;
    // Summary is often in sibling or parent; we keep it minimal
    const summary = $el.closest('.gs-c-promo').find('.gs-c-promo-summary').first().text().trim() || null;
    articles.push({
      headline: title,
      title,
      summary,
      content: summary || '',
      url: link,
      link,
      publisher: 'BBC',
      source: 'bbc',
      publishedAt: null
    });
  });

  return articles;
}

// Static scraper (cheerio): Hindustan Times (latest news)
export async function scrapeHT({ limit = 10 } = {}) {
  const base = 'https://www.hindustantimes.com';
  const url = `${base}/latest-news`;
  const html = await fetchHTML(url);
  const $ = load(html);

  const articles = [];
  $('div.cartHolder').each((_, el) => {
    if (articles.length >= limit) return false;
    const $el = $(el);
    const $a = $el.find('a').first();
    const link = absolute($a.attr('href') || '', base);
    const title = $el.find('h3').first().text().trim() || $a.text().trim();
    if (!title || !link) return;

    const summary = $el.find('h2, p').first().text().trim() || null;
    const publishedAt = $el.find('span.dateTime').first().text().trim() || null;

    articles.push({
      headline: title,
      title,
      summary,
      content: summary || '',
      url: link,
      link,
      publisher: 'Hindustan Times',
      source: 'ht',
      publishedAt: publishedAt || null
    });
  });

  return articles.slice(0, limit);
}
