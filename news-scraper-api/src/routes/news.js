import { Router } from 'express';
import { scrapeTOI } from '../scrapers/timesOfIndia.js';
import { scrapeBBC } from '../scrapers/bbc.js';
import { scrapeHT } from '../scrapers/hindustanTimes.js';
import { scrapeGuardian } from '../scrapers/theGuardian.js';
import { scrapeGenericArticle } from '../scrapers/genericScraper.js';
import Article from '../models/Article.js';

const router = Router();

// Map of available scrapers
const scrapers = {
  toi: scrapeTOI,
  bbc: scrapeBBC,
  ht: scrapeHT,
  guardian: scrapeGuardian
};

const availableSources = Object.keys(scrapers);

/**
 * GET /api/news?sources=toi,bbc&limit=10
 * Live scrape news from specified sources (comma-separated)
 */
router.get('/', async (req, res, next) => {
  try {
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    if (isNaN(limit) || limit <= 0) limit = 10;
    if (limit > 50) limit = 50;

    // Parse sources parameter (comma-separated)
    let sources = [];
    if (req.query.sources) {
      sources = req.query.sources.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else {
      sources = ['toi']; // Default source
    }

    // Validate sources
    const invalidSources = sources.filter(s => !availableSources.includes(s));
    if (invalidSources.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid sources: ${invalidSources.join(', ')}`,
        availableSources: availableSources
      });
    }

    console.log(`[api:news] live scrape requested for sources: ${sources.join(', ')}, limit=${limit}`);

    // Scrape all requested sources in parallel
    const scrapePromises = sources.map(source => 
      scrapers[source]({ limit, saveToDb: true })
        .then(articles => ({ source, articles, success: true }))
        .catch(error => ({ source, error: error.message, success: false }))
    );

    const results = await Promise.all(scrapePromises);

    // Collect all articles
    const allArticles = [];
    const errors = [];

    for (const result of results) {
      if (result.success) {
        allArticles.push(...result.articles);
      } else {
        errors.push({ source: result.source, error: result.error });
      }
    }

    // Persist scraped articles using Article.saveArticle which now upserts into the unified articles collection
    let savedCount = 0;
    for (const a of allArticles) {
      try {
        const r = await Article.saveArticle(a);
        if (r.saved) savedCount++;
      } catch (e) {
        console.warn('[api:news] failed to save article', e?.message || e);
      }
    }

    res.status(errors.length > 0 && allArticles.length === 0 ? 500 : 200).json({
      status: errors.length > 0 && allArticles.length === 0 ? 'error' : 'success',
      total: allArticles.length,
      saved: savedCount,
      sources: sources,
      message: `Scraped ${allArticles.length} articles from ${sources.join(', ')}`,
      errors: errors.length > 0 ? errors : undefined,
      data: allArticles.map(article => ({
        headline: article.headline || article.title,
        publisher: article.publisher || article.source,
        url: article.url || article.link,
        publishedAt: article.publishedAt,
        scrapedAt: article.scrapedAt
      }))
    });

  } catch (error) {
    console.error('[api:news] error during live scrape:', error.message);
    next({
      status: 500,
      message: `Failed to scrape news: ${error.message}`
    });
  }
});

/**
 * GET /api/news/sources
 * Get list of available sources
 */
router.get('/sources', (req, res) => {
  res.json({
    status: 'success',
    total: availableSources.length,
    data: availableSources.map(source => ({
      id: source,
      name: source.toUpperCase()
    }))
  });
});

/**
 * GET /api/news/stored?limit=20&source=toi
 * Retrieve stored articles from MongoDB
 */
router.get('/stored', async (req, res, next) => {
  try {
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    if (isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    const publisher = req.query.publisher || null;

    console.log(`[api:news] fetching stored articles, limit=${limit}, publisher=${publisher || 'all'}`);

    // Build query
    const q = {};
    if (publisher) q.publisher = publisher;

    const articles = await Article.find(q).sort({ scrapedAt: -1 }).limit(limit).lean();

    res.status(200).json({
      status: 'success',
      total: articles.length,
      publisher: publisher || 'all',
      message: 'Articles retrieved from database',
      data: articles.map(article => ({
        id: article._id,
        headline: article.headline,
        publisher: article.publisher,
        url: article.url,
        factual: article.factual,
        bias: article.bias,
        classification: article.classification,
        publishedAt: article.publishedAt,
        scrapedAt: article.scrapedAt,
        createdAt: article.createdAt
      }))
    });

  } catch (error) {
    console.error('[api:news] error fetching stored articles:', error.message);
    next({
      status: 500,
      message: `Failed to fetch stored articles: ${error.message}`
    });
  }
});

/**
 * POST /api/news/scrape-url
 * Scrape a single article from a given URL
 * Body: { url: string, saveToDb?: boolean }
 */
router.post('/scrape-url', async (req, res, next) => {
  try {
    const { url, saveToDb = false } = req.body;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format'
      });
    }

    console.log(`[api:news] scraping single URL: ${url}`);

    // Scrape the article using generic scraper
    const article = await scrapeGenericArticle(url);

    // Optionally save to database
    let saved = false;
    if (saveToDb) {
      try {
        const result = await Article.saveArticle(article);
        saved = result.saved;
      } catch (e) {
        console.warn('[api:news] failed to save article:', e?.message || e);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Article scraped successfully',
      saved: saved,
      data: {
        headline: article.headline,
        publisher: article.publisher,
        content: article.content,
        url: article.url,
        publishedAt: article.publishedAt,
        scrapedAt: article.scrapedAt
      }
    });

  } catch (error) {
    console.error('[api:news] error scraping URL:', error.message);
    next({
      status: 500,
      message: `Failed to scrape URL: ${error.message}`
    });
  }
});

export default router;
