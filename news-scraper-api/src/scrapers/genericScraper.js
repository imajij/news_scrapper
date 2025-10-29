import { load } from 'cheerio';
import { fetchHTML } from '../utils/fetchHTML.js';

/**
 * Generic scraper for any news article URL
 * Extracts article content using common HTML patterns
 * @param {string} url - The article URL to scrape
 * @returns {Promise<object>} - Scraped article object
 */
export async function scrapeGenericArticle(url) {
  console.log(`[scraper:generic] scraping URL: ${url}`);

  try {
    // Fetch HTML content
    const html = await fetchHTML(url);
    const $ = load(html);

    // Extract publisher/site name
    let publisher = null;
    
    // Try various meta tags for publisher
    publisher = $('meta[property="og:site_name"]').attr('content') ||
                $('meta[name="publisher"]').attr('content') ||
                $('meta[name="application-name"]').attr('content') ||
                $('meta[property="og:site"]').attr('content');
    
    // Fallback to domain name
    if (!publisher) {
      try {
        const urlObj = new URL(url);
        publisher = urlObj.hostname.replace('www.', '').split('.')[0];
        // Capitalize first letter
        publisher = publisher.charAt(0).toUpperCase() + publisher.slice(1);
      } catch (e) {
        publisher = 'Unknown';
      }
    }

    // Extract title/headline
    let headline = null;
    
    headline = $('meta[property="og:title"]').attr('content') ||
               $('meta[name="twitter:title"]').attr('content') ||
               $('h1').first().text().trim() ||
               $('title').text().trim().split('|')[0].trim();

    // Extract content
    let content = '';

    // Try to find article tag first
    const $article = $('article');
    if ($article.length > 0) {
      // Get all paragraphs within article
      $article.find('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) { // Skip very short paragraphs
          content += text + '\n\n';
        }
      });
    }

    // Fallback: collect all paragraphs
    if (content.length < 100) {
      content = '';
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          content += text + '\n\n';
        }
      });
    }

    // Extract description if content is still too short
    if (content.length < 100) {
      const description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         '';
      content = description + '\n\n' + content;
    }

    // Extract published date
    let publishedAt = null;
    
    const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                    $('meta[name="publishdate"]').attr('content') ||
                    $('meta[property="og:published_time"]').attr('content') ||
                    $('time').attr('datetime');
    
    if (dateStr) {
      try {
        publishedAt = new Date(dateStr);
      } catch (e) {
        publishedAt = null;
      }
    }

    // Build article object
    const article = {
      headline: headline || 'Untitled',
      publisher: publisher,
      content: content.trim().slice(0, 20000), // Limit to 20k chars
      url: url,
      publishedAt: publishedAt,
      scrapedAt: new Date()
    };

    // Validate minimum requirements
    if (!article.headline || article.headline.length < 5) {
      throw new Error('Could not extract article headline');
    }

    if (!article.content || article.content.length < 50) {
      throw new Error('Could not extract sufficient article content');
    }

    console.log(`[scraper:generic] successfully scraped: ${article.headline.slice(0, 50)}...`);
    
    return article;

  } catch (error) {
    console.error(`[scraper:generic] error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape article: ${error.message}`);
  }
}
