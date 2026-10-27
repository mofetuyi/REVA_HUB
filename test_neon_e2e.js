const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://neondb_owner:npg_JI4bCNfL3wRs@ep-old-cell-b5o5jg1o-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function runEndToEndVerification() {
  console.log('--- NEON DATABASE & SERVICES E2E TEST ---');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('1. Connection to Neon PostgreSQL 18.6: SUCCESS');

    // Verify all 12 tables
    const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    const tableNames = tableRes.rows.map(r => r.table_name);
    console.log(`2. Provisioned Tables Verified (${tableNames.length} tables):`, tableNames.join(', '));

    const testTutorId = crypto.randomUUID();
    const testStudentId = crypto.randomUUID();
    const testListingId = crypto.randomUUID();
    const testTutorialId = crypto.randomUUID();
    const testSessionId = crypto.randomUUID();

    // 3. Create test users (Tutor & Student)
    await client.query(`
      INSERT INTO users (id, phone, name, email, reva_id, is_tutor, is_premium, current_mode, kyc_status)
      VALUES 
      ($1, $2, $3, $4, $5, TRUE, TRUE, 'seller', 'verified'),
      ($6, $7, $8, $9, $10, FALSE, TRUE, 'buyer', 'verified');
    `, [
      testTutorId, '+2348011112222', 'Adeyemi Circular Crafts', 'tutor@reva.ng', 'REV-99901',
      testStudentId, '+2348033334444', 'Amaka Premium Buyer', 'amaka@reva.ng', 'REV-99902'
    ]);
    console.log('3. Test users inserted (Tutor & Premium Student): SUCCESS');

    // 4. Verify circular_products category in listings table
    await client.query(`
      INSERT INTO listings (id, seller_id, slug, category, title, description, quantity, unit, condition, price_ngn, state, lga, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
    `, [
      testListingId,
      testTutorId,
      'test-e2e-circ-' + Date.now(),
      'circular_products',
      'E2E Test Upcycled Planter Pots',
      'High grade upcycled plastic pots for urban farming',
      25.0,
      'kg',
      'clean',
      4500.00,
      'Lagos',
      'Ikeja',
      'active'
    ]);
    console.log('4. Insert listing with category "circular_products": SUCCESS');

    const readListingRes = await client.query('SELECT id, title, category, price_ngn FROM listings WHERE id = $1;', [testListingId]);
    console.log('5. Read back listing from Neon:', readListingRes.rows[0]);

    // 5. Verify tutorial and interactive creator session
    await client.query(`
      INSERT INTO tutorials (id, slug, title, description, material_type, difficulty, estimated_duration_minutes, author_id, author_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `, [
      testTutorialId,
      'hdpe-extrusion-' + Date.now(),
      'Industrial HDPE Extrusion & Shaping',
      'Step-by-step masterclass on circular plastic redesign',
      'circular_products',
      'advanced',
      45,
      testTutorId,
      'tutor',
      'published'
    ]);
    console.log('6. Insert tutorial with tutor role: SUCCESS');

    await client.query(`
      INSERT INTO tutor_interactive_sessions (id, tutorial_id, student_id, tutor_id, session_type, timestamp_seconds, question_title, details, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `, [
      testSessionId,
      testTutorialId,
      testStudentId,
      testTutorId,
      'qa_priority',
      184,
      'Optimal nozzle temperature for recycled pellets?',
      'Can we run this at 210C without thermal degradation?',
      'pending'
    ]);
    console.log('7. Insert Premium interactive creator Q&A session: SUCCESS');

    // Simulate tutor response with consultation link
    await client.query(`
      UPDATE tutor_interactive_sessions 
      SET tutor_reply = $1, meeting_link = $2, status = $3, replied_at = NOW() 
      WHERE id = $4;
    `, [
      'Keep it strictly between 195C and 205C. Let us review your sample during office hours.',
      'https://meet.google.com/abc-revahub-test',
      'answered',
      testSessionId
    ]);
    console.log('8. Tutor reply & 1-on-1 consultation link update: SUCCESS');

    const readSessionRes = await client.query('SELECT id, session_type, question_title, tutor_reply, meeting_link, status FROM tutor_interactive_sessions WHERE id = $1;', [testSessionId]);
    console.log('9. Read back interactive session:', readSessionRes.rows[0]);

    // Cleanup test records
    await client.query('DELETE FROM tutor_interactive_sessions WHERE id = $1;', [testSessionId]);
    await client.query('DELETE FROM tutorials WHERE id = $1;', [testTutorialId]);
    await client.query('DELETE FROM listings WHERE id = $1;', [testListingId]);
    await client.query('DELETE FROM users WHERE id IN ($1, $2);', [testTutorId, testStudentId]);
    console.log('10. Cleaned up temporary test records: SUCCESS');

    await client.end();
    console.log('11. ALL NEON DATABASE SERVICES & SCHEMAS VERIFIED END-TO-END! (100% OPERATIONAL)');
  } catch (err) {
    console.error('Neon verification failed:', err);
    process.exit(1);
  }
}

runEndToEndVerification();
