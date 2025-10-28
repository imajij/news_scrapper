import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  // Match Satya backend Article schema
  headline: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  publisher: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  factual: {
    // 0-100 publisher baseline or computed factuality
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  bias: {
    type: String,
    enum: ['left', 'right', 'neutral'],
    default: 'neutral'
  },
  classification: {
    type: String,
    enum: ['verified', 'unverified', 'false', 'misleading'],
    default: 'unverified'
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'articles'
});

// Indexes
articleSchema.index({ url: 1 }, { unique: true });
articleSchema.index({ publisher: 1 });

/**
 * Save or upsert a scraped article to match the project's Article schema.
 * Accepts flexible input keys from scrapers and normalizes them.
 */
articleSchema.statics.saveArticle = async function(articleData) {
  try {
    const doc = {
      headline: articleData.title || articleData.headline || articleData.summary || '',
      publisher: articleData.publisher || articleData.source || articleData.site || 'unknown',
      content: articleData.content || articleData.summary || articleData.excerpt || '',
      url: articleData.link || articleData.url,
      scrapedAt: articleData.scrapedAt || new Date()
    };

    if (!doc.url || !doc.headline) {
      return { saved: false, reason: 'invalid' };
    }

    const res = await this.updateOne({ url: doc.url }, { $setOnInsert: doc }, { upsert: true });
    if (res.upsertedCount && res.upsertedCount > 0) {
      return { saved: true, article: doc };
    }
    // existing
    return { saved: false, reason: 'duplicate' };
  } catch (error) {
    if (error.code === 11000) return { saved: false, reason: 'duplicate' };
    throw error;
  }
};

/**
 * Get recent articles
 */
articleSchema.statics.getRecent = async function(limit = 20) {
  return this.find({})
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();
};

const Article = mongoose.model('Article', articleSchema);

export default Article;
