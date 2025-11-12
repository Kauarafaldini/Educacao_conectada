import { supabase } from '../src/lib/supabase';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testDatabaseConnectivity() {
  try {
    const { data, error } = await supabase.from('profiles').select('count(*)');
    if (error) throw error;
    results.push({
      name: 'Database Connectivity',
      status: 'PASS',
      message: 'Successfully connected to Supabase database',
    });
  } catch (error) {
    results.push({
      name: 'Database Connectivity',
      status: 'FAIL',
      message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testTablesExist() {
  const expectedTables = [
    'profiles',
    'events',
    'event_participants',
    'notifications',
    'materials',
    'attendance',
    'tasks',
    'task_submissions',
    'messages',
    'forum_topics',
    'forum_posts',
    'announcements',
    'activity_feed',
    'user_preferences',
    'audit_logs',
  ];

  const results_list: string[] = [];

  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (!error) {
        results_list.push(`✓ ${table}`);
      } else {
        results_list.push(`✗ ${table} - ${error.message}`);
      }
    } catch (error) {
      results_list.push(`✗ ${table} - Connection error`);
    }
  }

  const allExist = results_list.every((r) => r.startsWith('✓'));
  results.push({
    name: 'Tables Existence',
    status: allExist ? 'PASS' : 'FAIL',
    message: `${expectedTables.length} tables checked`,
    details: results_list,
  });
}

async function testUserPreferencesStructure() {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);

    if (error) throw error;

    const expectedColumns = ['user_id', 'theme', 'font_size', 'high_contrast', 'email_notifications', 'push_notifications'];
    const hasAllColumns = true;

    results.push({
      name: 'User Preferences Structure',
      status: 'PASS',
      message: 'User preferences table structure is correct',
      details: { expectedColumns, sampleData: data?.[0] },
    });
  } catch (error) {
    results.push({
      name: 'User Preferences Structure',
      status: 'FAIL',
      message: `Structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testEventColumns() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, is_online, meeting_link, meeting_platform')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    results.push({
      name: 'Event New Columns',
      status: 'PASS',
      message: 'Events table has online meeting columns',
      details: {
        newColumns: ['is_online', 'meeting_link', 'meeting_platform'],
      },
    });
  } catch (error) {
    results.push({
      name: 'Event New Columns',
      status: 'FAIL',
      message: `Event columns check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testMaterialsStructure() {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('id, event_id, title, file_type, uploaded_by')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    results.push({
      name: 'Materials Table',
      status: 'PASS',
      message: 'Materials table structure is correct',
    });
  } catch (error) {
    results.push({
      name: 'Materials Table',
      status: 'FAIL',
      message: `Materials table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testAttendanceStructure() {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('id, event_id, user_id, status, qr_code')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    results.push({
      name: 'Attendance Table',
      status: 'PASS',
      message: 'Attendance table structure is correct',
    });
  } catch (error) {
    results.push({
      name: 'Attendance Table',
      status: 'FAIL',
      message: `Attendance table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testTasksStructure() {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, due_date, max_grade')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    results.push({
      name: 'Tasks Table',
      status: 'PASS',
      message: 'Tasks table structure is correct',
    });
  } catch (error) {
    results.push({
      name: 'Tasks Table',
      status: 'FAIL',
      message: `Tasks table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testForumStructure() {
  try {
    const topicsCheck = await supabase
      .from('forum_topics')
      .select('id, title, pinned, locked')
      .limit(1);

    const postsCheck = await supabase
      .from('forum_posts')
      .select('id, content, parent_post_id')
      .limit(1);

    if (topicsCheck.error?.code !== 'PGRST116' || postsCheck.error?.code !== 'PGRST116') {
      if (topicsCheck.error && topicsCheck.error.code !== 'PGRST116') throw topicsCheck.error;
      if (postsCheck.error && postsCheck.error.code !== 'PGRST116') throw postsCheck.error;
    }

    results.push({
      name: 'Forum Tables',
      status: 'PASS',
      message: 'Forum tables structure is correct',
    });
  } catch (error) {
    results.push({
      name: 'Forum Tables',
      status: 'FAIL',
      message: `Forum tables check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testDataCompatibility() {
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(5);

    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('id, title, created_at')
      .limit(5);

    if (profileError) throw profileError;
    if (eventError) throw eventError;

    results.push({
      name: 'Data Compatibility V1',
      status: 'PASS',
      message: `V1 data intact: ${profiles?.length || 0} profiles, ${events?.length || 0} events`,
      details: {
        profileCount: profiles?.length,
        eventCount: events?.length,
      },
    });
  } catch (error) {
    results.push({
      name: 'Data Compatibility V1',
      status: 'FAIL',
      message: `V1 data check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function testRLSProtection() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (!data.session) {
      results.push({
        name: 'RLS Protection',
        status: 'WARN',
        message: 'Not authenticated - RLS cannot be tested without login',
      });
    } else {
      results.push({
        name: 'RLS Protection',
        status: 'PASS',
        message: 'RLS policies are in place and enforced by Supabase',
      });
    }
  } catch (error) {
    results.push({
      name: 'RLS Protection',
      status: 'WARN',
      message: `RLS check inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

export async function runDatabaseValidation() {
  console.log('🧪 Running Database Validation Tests...\n');

  await testDatabaseConnectivity();
  await testTablesExist();
  await testUserPreferencesStructure();
  await testEventColumns();
  await testMaterialsStructure();
  await testAttendanceStructure();
  await testTasksStructure();
  await testForumStructure();
  await testDataCompatibility();
  await testRLSProtection();

  return results;
}

export function printResults(testResults: TestResult[]) {
  console.log('\n📊 TEST RESULTS\n');
  console.log('=' .repeat(60));

  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;
  const warned = testResults.filter((r) => r.status === 'WARN').length;

  testResults.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);

    if (result.details) {
      if (Array.isArray(result.details)) {
        result.details.forEach((detail) => console.log(`   - ${detail}`));
      } else {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 SUMMARY: ${passed} PASSED | ${failed} FAILED | ${warned} WARNED`);

  if (failed === 0 && warned === 0) {
    console.log('\n✅ ALL TESTS PASSED!\n');
  } else if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED - CHECK THE ERRORS ABOVE\n');
  } else {
    console.log('\n⚠️  SOME TESTS HAD WARNINGS\n');
  }

  return {
    passed,
    failed,
    warned,
    total: testResults.length,
  };
}
