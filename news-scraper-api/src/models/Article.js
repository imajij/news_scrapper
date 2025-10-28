import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    enum: ['toi', 'bbc', 'ht', 'guardian', 'cnn', 'ndtv', 'other']
  },
  publishedAt: {
    type: Date,
    default: null
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

// Create compound index to prevent duplicate articles (same title + source)
articleSchema.index({ title: 1, source: 1 }, { unique: true });

// Create index on link for faster lookups
articleSchema.index({ link: 1 });

/**
 * Static method to save article, handling duplicates gracefully
 */
articleSchema.statics.saveArticle = async function(articleData) {
  try {
    const article = new this(articleData);
    await article.save();
    return { saved: true, article };
  } catch (error) {
    // Handle duplicate key error (code 11000)
    if (error.code === 11000) {
      return { saved: false, reason: 'duplicate' };
    }
    throw error;
  }
};

/**
 * Static method to get recent articles
 */
articleSchema.statics.getRecent = async function(limit = 20, source = null) {
  const query = source ? { source } : {};
  return this.find(query)
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();
};

const Article = mongoose.model('Article', articleSchema);

export default Article;
