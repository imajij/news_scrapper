import axios from 'axios';

/**
 * Fetch HTML content from a URL with custom headers and timeout
 * @param {string} url - The URL to fetch
 * @param {object} options - Additional options
 * @returns {Promise<string>} - HTML content as string
 */
export async function fetchHTML(url, options = {}) {
  const timeout = parseInt(process.env.SCRAPE_TIMEOUT_MS || '10000', 10);
  const userAgent = process.env.USER_AGENT || 'NewsScraperBot/1.0';

  try {
    const response = await axios.get(url, {
      timeout,
      maxRedirects: 5,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        ...options.headers
      },
      validateStatus: (status) => status >= 200 && status < 400
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new Error(`Expected HTML content from ${url}`);
    }

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timeout after ${timeout}ms for ${url}`);
    }
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}
