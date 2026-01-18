
import 'dotenv/config';
import { createUserProfilesTable } from './utils/db/migrate';
import { db } from './utils/db/dbConfig';

async function runMigration() {
    console.log('Running migration...');
    try {
        await createUserProfilesTable();
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

runMigration();
