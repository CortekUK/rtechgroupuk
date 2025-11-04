const { createClient } = require('@supabase/supabase-js');

// Old database
const oldSupabase = createClient(
  'https://wrogevjpvhvputrjhvvg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb2dldmpwdmh2cHV0cmpodnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTUxNDYsImV4cCI6MjA3MzI5MTE0Nn0.gORhHgYY3GpcOiiGfI-K8PrtQscttZgMVvH_Fv_wUII'
);

// New database
const newSupabase = createClient(
  'https://skjytxbkbfpkcmcyqyfy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNranl0eGJrYmZwa2NtY3lxeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNjMyMjMsImV4cCI6MjA3NzYzOTIyM30.QK7-rBNsemTaDqXoSHjivOXV2B4dC1YJ8wdw77c01pY'
);

// List of tables to migrate (in order to respect foreign keys)
const tables = [
  'app_users',
  'customers',
  'vehicles',
  'rentals',
  'payments',
  'fines',
  'plates',
  'insurance_policies',
  'customer_documents',
  'insurance_documents',
  'leads',
  'authority_payments',
  'fine_files',
  'ledger_entries',
  'login_attempts',
  'maintenance_runs',
  'org_settings',
  'payment_applications',
  'pnl_entries',
  'reminder_actions',
  'audit_logs'
];

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Fetch all data from old database
    const { data, error } = await oldSupabase
      .from(tableName)
      .select('*');

    if (error) {
      console.log(`⚠️  Skipping ${tableName}: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`✓ ${tableName}: No data to migrate`);
      return;
    }

    console.log(`  Found ${data.length} rows`);

    // Insert data into new database in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error: insertError } = await newSupabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`  ❌ Error inserting batch ${i}-${i + batch.length}: ${insertError.message}`);
      } else {
        console.log(`  ✓ Inserted rows ${i + 1}-${Math.min(i + batchSize, data.length)}`);
      }
    }

    console.log(`✅ ${tableName}: Migration complete (${data.length} rows)`);
  } catch (err) {
    console.error(`❌ Error migrating ${tableName}:`, err.message);
  }
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  console.log('Old DB: wrogevjpvhvputrjhvvg');
  console.log('New DB: skjytxbkbfpkcmcyqyfy\n');

  for (const table of tables) {
    await migrateTable(table);
  }

  console.log('\n✅ Migration complete!\n');
}

main().catch(console.error);
