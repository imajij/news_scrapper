import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage directory for scraped data
const STORAGE_DIR = join(__dirname, '../../data');

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('[fileStorage] failed to create storage directory:', error.message);
  }
}

/**
 * Save articles to JSON file
 */
export async function saveToFile(articles, source = 'all') {
  try {
    await ensureStorageDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `articles_${source}_${timestamp}.json`;
    const filepath = join(STORAGE_DIR, filename);

    const data = {
      source,
      total: articles.length,
      timestamp: new Date().toISOString(),
      articles
    };

    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[fileStorage] ✅ Saved ${articles.length} articles to ${filename}`);

    // Also update the latest file for this source
    const latestFilepath = join(STORAGE_DIR, `latest_${source}.json`);
    await fs.writeFile(latestFilepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[fileStorage] ✅ Updated latest_${source}.json`);

    return filepath;
  } catch (error) {
    console.error('[fileStorage] ❌ Failed to save articles:', error.message);
    throw error;
  }
}

/**
 * Load articles from latest file
 */
export async function loadFromFile(source = 'all') {
  try {
    const filepath = join(STORAGE_DIR, `latest_${source}.json`);
    const data = await fs.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.articles || [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[fileStorage] failed to load articles:', error.message);
    }
    return [];
  }
}

/**
 * Load all articles from storage directory
 */
export async function loadAllFromFiles(limit = 20) {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    const latestFiles = files.filter(f => f.startsWith('latest_'));

    const allArticles = [];
    for (const file of latestFiles) {
      const filepath = join(STORAGE_DIR, file);
      const data = await fs.readFile(filepath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.articles) {
        allArticles.push(...parsed.articles);
      }
    }

    // Sort by scrapedAt descending
    allArticles.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

    return allArticles.slice(0, limit);
  } catch (error) {
    console.error('[fileStorage] failed to load all articles:', error.message);
    return [];
  }
}

/**
 * Get all stored article files
 */
export async function getStorageFiles() {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    const fileStats = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = join(STORAGE_DIR, file);
        const stats = await fs.stat(filepath);
        const data = await fs.readFile(filepath, 'utf-8');
        const parsed = JSON.parse(data);

        fileStats.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          articleCount: parsed.total || 0,
          source: parsed.source || 'unknown'
        });
      }
    }

    return fileStats.sort((a, b) => b.modified - a.modified);
  } catch (error) {
    console.error('[fileStorage] failed to get storage files:', error.message);
    return [];
  }
}
