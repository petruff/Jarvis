import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'jarvis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };

  const client = new Pool(config);

  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await client.query('SELECT NOW()');
    console.log('✅ Connected successfully\n');

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.match(/^\d{3}_phase7_.*\.sql$/))
      .sort();

    console.log(`────────────────────────────────────────────`);
    console.log(`  Phase 7: Database Migrations`);
    console.log(`────────────────────────────────────────────\n`);
    console.log(`Found ${files.length} migration(s) to apply:\n`);

    for (const file of files) {
      console.log(`📋 ${file}`);
    }

    console.log(`\n────────────────────────────────────────────\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`⏳ Applying ${file}...`);
      try {
        await client.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (err: any) {
        console.error(`❌ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log(`────────────────────────────────────────────`);
    console.log(`✅ All migrations completed successfully!`);
    console.log(`────────────────────────────────────────────\n`);

    // Verify tables created
    console.log(`🔍 Verifying tables created...\n`);
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%tenant%'
          OR table_name LIKE '%role%'
          OR table_name LIKE '%backup%'
          OR table_name LIKE '%consensus%'
          OR table_name LIKE '%clone_comparison%')
      ORDER BY table_name;
    `);

    if (result.rows.length === 0) {
      console.warn('⚠️  No tables found. Check migration execution.');
    } else {
      console.log(`Found ${result.rows.length} Phase 7 tables:\n`);
      result.rows.forEach((row: any, idx: number) => {
        console.log(`  ${idx + 1}. ${row.table_name}`);
      });
    }

    console.log(`\n────────────────────────────────────────────`);
    console.log(`📊 Table Summary:`);
    console.log(`────────────────────────────────────────────\n`);

    const tableDetails = await client.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
        (SELECT COUNT(*) FROM pg_tables WHERE tablename = t.table_name AND rowsecurity = TRUE) as rls_enabled
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND (table_name LIKE '%tenant%'
          OR table_name LIKE '%role%'
          OR table_name LIKE '%backup%'
          OR table_name LIKE '%consensus%'
          OR table_name LIKE '%clone_comparison%')
      ORDER BY table_name;
    `);

    tableDetails.rows.forEach((row: any) => {
      const rls = row.rls_enabled > 0 ? '🔒 RLS' : '';
      console.log(`  ${row.table_name.padEnd(30)} (${row.column_count} columns) ${rls}`);
    });

    console.log(`\n────────────────────────────────────────────`);
    console.log(`✅ Phase 7 migrations are ready!`);
    console.log(`────────────────────────────────────────────\n`);

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations().catch(console.error);
