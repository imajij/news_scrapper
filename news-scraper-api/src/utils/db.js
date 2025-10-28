import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connect to MongoDB Atlas
 */
export async function connectDB() {
  if (isConnected) {
    console.log('[db] using existing connection');
    return;
  }

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    // Connect to MongoDB with recommended options
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('[db] connected to MongoDB Atlas');
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('[db] connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[db] disconnected from MongoDB');
      isConnected = false;
    });
    
  } catch (error) {
    console.error('[db] failed to connect:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[db] disconnected from MongoDB');
  } catch (error) {
    console.error('[db] error during disconnect:', error.message);
  }
}

/**
 * Check if database is connected
 */
export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
