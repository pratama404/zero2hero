import { sql } from 'drizzle-orm';
import { db } from './dbConfig';

export async function createUserProfilesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        phone VARCHAR(20),
        address TEXT,
        profile_image TEXT,
        notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ user_profiles table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating user_profiles table:', error);
    return false;
  }
}