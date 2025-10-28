# News Scraper API with MongoDB Atlas

A production-ready Node.js Express API that scrapes news articles from Times of India, stores them in MongoDB Atlas, and exposes REST endpoints for real-time scraping and retrieving stored data.

## Features

- **Live Scraping**: Scrapes news articles in real-time from Times of India
- **MongoDB Storage**: Stores articles in MongoDB Atlas with automatic duplicate prevention
- **REST API**: Clean JSON endpoints for both live and stored data
- **Error Handling**: Robust error handling and logging
- **Production Ready**: Includes security headers, compression, CORS, and graceful shutdown
- **No Docker**: Runs directly with Node.js and npm

---

## Prerequisites

- **Node.js 20+** installed on your system
- **MongoDB Atlas Account** (free tier available)
- **Git** for version control

---

## MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account and log in
3. Create a new cluster (free M0 tier is sufficient)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/...`)
6. Replace `<username>` and `<password>` with your database credentials
7. Add your IP address to the whitelist (or use `0.0.0.0/0` for testing)

---

## Local Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd news-scraper-api
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your MongoDB Atlas connection string:

```properties
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/news-scraper?retryWrites=true&w=majority
USER_AGENT=NewsScraperBot/1.0 (+contact@example.com)
SCRAPE_TIMEOUT_MS=10000
```

### 3. Run the Server

**Development mode** (with auto-restart):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:5000`

---

## API Endpoints

### Health Check
```bash
GET /healthz
GET /
```

### Live Scrape (scrapes and stores articles)
```bash
GET /api/news?limit=10
```

**Query Parameters:**
- `limit` (optional): Number of articles to scrape (default: 10, max: 50)

**Example:**
```bash
curl "http://localhost:5000/api/news?limit=5"
```

**Response:**
```json
{
  "status": "success",
  "total": 5,
  "source": "toi",
  "message": "Articles scraped and saved successfully",
  "data": [
    {
      "title": "Breaking News: Example Article Title",
      "summary": "This is a brief summary of the article...",
      "link": "https://timesofindia.indiatimes.com/articleshow/12345",
      "source": "toi",
      "publishedAt": "2024-01-15T10:30:00.000Z",
      "scrapedAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

### Retrieve Stored Articles
```bash
GET /api/news/stored?limit=20&source=toi
```

**Query Parameters:**
- `limit` (optional): Number of articles to retrieve (default: 20, max: 100)
- `source` (optional): Filter by source (e.g., 'toi', 'bbc', 'ht')

**Example:**
```bash
curl "http://localhost:5000/api/news/stored?limit=10"
```

**Response:**
```json
{
  "status": "success",
  "total": 10,
  "source": "all",
  "message": "Articles retrieved from database",
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Stored Article Title",
      "summary": "Article summary from database...",
      "link": "https://timesofindia.indiatimes.com/articleshow/67890",
      "source": "toi",
      "publishedAt": "2024-01-15T09:00:00.000Z",
      "scrapedAt": "2024-01-15T11:30:00.000Z",
      "createdAt": "2024-01-15T11:30:00.000Z"
    }
  ]
}
```

---

## Testing Locally

1. **Health Check:**
```bash
curl http://localhost:5000/healthz
```

2. **Scrape Articles:**
```bash
curl "http://localhost:5000/api/news?limit=5"
```

3. **Get Stored Articles:**
```bash
curl "http://localhost:5000/api/news/stored?limit=10"
```

4. **Filter by Source:**
```bash
curl "http://localhost:5000/api/news/stored?source=toi&limit=5"
```

---

## Deployment on Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: News Scraper API"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `news-scraper-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or your preferred plan)

### Step 3: Add Environment Variables

In Render's "Environment" section, add:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/news-scraper?retryWrites=true&w=majority
USER_AGENT=NewsScraperBot/1.0 (+contact@example.com)
SCRAPE_TIMEOUT_MS=10000
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy your app
3. Once deployed, you'll get a URL like: `https://news-scraper-api.onrender.com`

### Step 5: Test Production API

```bash
curl "https://news-scraper-api.onrender.com/healthz"
curl "https://news-scraper-api.onrender.com/api/news?limit=5"
curl "https://news-scraper-api.onrender.com/api/news/stored?limit=10"
```

---

## Project Structure

```
news-scraper-api/
├── src/
│   ├── models/
│   │   └── Article.js         # Mongoose schema for articles
│   ├── routes/
│   │   └── news.js            # API route handlers
│   ├── scrapers/
│   │   └── timesOfIndia.js    # TOI scraper implementation
│   ├── utils/
│   │   ├── db.js              # MongoDB connection utility
│   │   └── fetchHTML.js       # Axios wrapper for fetching HTML
│   └── server.js              # Express server entry point
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

---

## Key Features Explained

### Duplicate Prevention
Articles are stored with a unique compound index on `title + source`, preventing duplicate entries automatically.

### Graceful Shutdown
The server handles SIGINT and SIGTERM signals, closing database connections properly before exit.

### Error Handling
All async operations include try-catch blocks with meaningful error messages and logging.

### Performance
- Uses compression middleware for faster responses
- Implements connection pooling for MongoDB
- Includes security headers via Helmet

---

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `MONGODB_URI` | MongoDB Atlas connection string | - | **Yes** |
| `USER_AGENT` | Custom user agent for scraping | NewsScraperBot/1.0 | No |
| `SCRAPE_TIMEOUT_MS` | Request timeout in milliseconds | 10000 | No |

---

## Notes

- **Rate Limiting**: Consider adding rate limiting in production to prevent abuse
- **Proxy Rotation**: For large-scale scraping, use proxy rotation to avoid IP bans
- **Scraper Updates**: Website structures change; update selectors in `timesOfIndia.js` as needed
- **Monitoring**: Add monitoring tools like Sentry or LogRocket for production error tracking

---

## License

MIT

---

## Support

For issues or questions, please open an issue in the GitHub repository.
