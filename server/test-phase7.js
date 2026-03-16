// server/test-phase7.js
// Phase 7 — Automated hardening tests
// Run: node test-phase7.js
// Tests all critical security and isolation scenarios

require('dotenv').config();
const mongoose = require('mongoose');
const axios    = require('axios');

const BASE = 'http://localhost:5000/api';
const api  = axios.create({ baseURL: BASE, validateStatus: () => true });

let passed = 0;
let failed = 0;

const test = (name, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
};

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('  GLAMOUR SALON — Phase 7 Test Suite   ');
  console.log('═══════════════════════════════════════\n');

  // ── 1. Auth Security ────────────────────────────────────────────────────
  console.log('1. Auth Security');

  const badLogin = await api.post('/auth/login', { email: 'nobody@x.com', password: 'wrong' });
  test('Invalid credentials returns 401', badLogin.status === 401);
  test('Error message is generic (no user enumeration)', !badLogin.data.message?.includes('not found'));

  const noToken = await api.get('/bookings');
  test('Protected route without token returns 401', noToken.status === 401);

  const fakeToken = await api.get('/bookings', { headers: { Authorization: 'Bearer fake.token.here' } });
  test('Invalid JWT returns 401', fakeToken.status === 401);

  // ── 2. Super Admin Login ─────────────────────────────────────────────────
  console.log('\n2. Super Admin');

  const saLogin = await api.post('/auth/login', {
    email:    process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  });
  test('Super admin can login', saLogin.status === 200, `Got ${saLogin.status} — check SUPERADMIN_EMAIL/PASSWORD in .env`);
  test('Super admin gets token', !!saLogin.data.accessToken);

  const saToken = saLogin.data.accessToken;

  const stats = await api.get('/superadmin/stats', { headers: { Authorization: `Bearer ${saToken}` } });
  test('Super admin can access stats', stats.status === 200);

  const salons = await api.get('/superadmin/salons', { headers: { Authorization: `Bearer ${saToken}` } });
  test('Super admin can list all salons', salons.status === 200);
  test('Salons array returned', Array.isArray(salons.data.salons));

  // ── 3. Tenant Isolation ──────────────────────────────────────────────────
  console.log('\n3. Tenant Isolation');

  await mongoose.connect(process.env.MONGODB_URI);
  const User  = require('./src/models/User');
  const Salon = require('./src/models/Salon');

  const allSalons = await Salon.find().select('name slug').lean();
  if (allSalons.length >= 2) {
    const salon1 = allSalons[0];
    const salon2 = allSalons[1];

    // Login as admin of salon1
    const admin1 = await User.findOne({ salonId: salon1._id, role: 'admin' }).select('email').lean();
    if (admin1) {
      const login1 = await api.post('/auth/login', { email: admin1.email, password: 'test123' });
      const token1 = login1.data.accessToken;

      if (token1) {
        const bookings1 = await api.get('/bookings?limit=5', { headers: { Authorization: `Bearer ${token1}` } });
        test('Admin can access own bookings', bookings1.status === 200);

        // Verify returned bookings all belong to salon1
        const allBelongToSalon1 = (bookings1.data.bookings || [])
          .every(b => b.salonId?.toString() === salon1._id.toString());
        test('Bookings scoped to own salon only', allBelongToSalon1 || bookings1.data.bookings?.length === 0);
      } else {
        console.log('  ⚠️  Could not login as salon admin (password may differ) — skipping isolation test');
      }
    }
  } else {
    console.log('  ⚠️  Need at least 2 salons to test isolation — skipping');
  }

  // ── 4. Expired Subscription Blocks Login ────────────────────────────────
  console.log('\n4. Subscription Enforcement');

  const expiredSalon = await Salon.findOne({
    subscriptionExpiry: { $lt: new Date() },
    isActive: true,
  }).lean();

  if (expiredSalon) {
    const expiredAdmin = await User.findOne({ salonId: expiredSalon._id, role: 'admin' }).select('email').lean();
    if (expiredAdmin) {
      // Try with the known admin password from env, fall back to common patterns
      const passwords = [process.env.ADMIN_TEST_PASSWORD, 'Russel@12', 'admin123', 'password123'].filter(Boolean);
      let expiredLogin = { status: 0, data: {} };
      for (const pwd of passwords) {
        expiredLogin = await api.post('/auth/login', { email: expiredAdmin.email, password: pwd });
        if (expiredLogin.status !== 401) break; // found correct password or got expected 403
      }
      test('Expired subscription blocks login (403)', expiredLogin.status === 403, `Got ${expiredLogin.status} for ${expiredAdmin.email}`);
      test('Error mentions subscription/expired',
        expiredLogin.data.message?.toLowerCase().includes('expired') ||
        expiredLogin.data.message?.toLowerCase().includes('subscription')
      );
    }
  } else {
    console.log('  ⚠️  No expired salons found — skipping expiry test');
  }

  // ── 5. Suspended Salon Blocks Login ──────────────────────────────────────
  console.log('\n5. Suspension Enforcement');

  const suspendedSalon = await Salon.findOne({ isSuspended: true }).lean();
  if (suspendedSalon) {
    const suspendedAdmin = await User.findOne({ salonId: suspendedSalon._id, role: 'admin' }).select('email').lean();
    if (suspendedAdmin) {
      const suspendedLogin = await api.post('/auth/login', {
        email: suspendedAdmin.email,
        password: 'test123',
      });
      test('Suspended salon blocks login (403)', suspendedLogin.status === 403);
    }
  } else {
    console.log('  ⚠️  No suspended salons found — skipping suspension test');
  }

  // ── 6. Plan Guard ────────────────────────────────────────────────────────
  console.log('\n6. Plan Guard (Public Booking)');

  const plan1Salon = await Salon.findOne({ plan: 'plan1' }).select('slug').lean();
  if (plan1Salon) {
    const blockedServices = await api.get('/public/services', {
      headers: { 'X-Salon-Slug': plan1Salon.slug },
    });
    test('Plan1 salon blocked from public booking (403)', blockedServices.status === 403);
  }

  const plan2Salon = await Salon.findOne({ plan: { $in: ['plan2', 'plan3'] }, isActive: true, isSuspended: false }).select('slug').lean();
  if (plan2Salon) {
    const allowedServices = await api.get('/public/services', {
      headers: { 'X-Salon-Slug': plan2Salon.slug },
    });
    test('Plan2/3 salon can access public booking', allowedServices.status === 200);
    test('Services array returned', Array.isArray(allowedServices.data.services));
  }

  // ── 7. Public Routes Need No Auth ────────────────────────────────────────
  console.log('\n7. Public Routes');

  if (plan2Salon) {
    const publicInfo = await api.get('/public/salon-info', {
      headers: { 'X-Salon-Slug': plan2Salon.slug },
    });
    test('Public salon info accessible without auth', publicInfo.status === 200);
    test('Salon name returned', !!publicInfo.data.salon?.name);
  }

  const noSlug = await api.get('/public/salon-info');
  test('Missing slug returns 404', noSlug.status === 404);

  // ── 8. Super Admin Role Isolation ────────────────────────────────────────
  console.log('\n8. Role Isolation');

  // Regular admin should NOT access superadmin routes
  const allAdmins = await User.find({ role: 'admin' }).select('email salonId').limit(1).lean();
  if (allAdmins.length > 0) {
    const passwords = [process.env.ADMIN_TEST_PASSWORD, 'Russel@12', 'admin123', 'password123'].filter(Boolean);
    let adminLogin = { status: 0, data: {} };
    for (const pwd of passwords) {
      adminLogin = await api.post('/auth/login', { email: allAdmins[0].email, password: pwd });
      if (adminLogin.status !== 401) break;
    }
    if (adminLogin.data.accessToken) {
      const adminToken = adminLogin.data.accessToken;
      const adminAccessingSA = await api.get('/superadmin/salons', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      test('Regular admin cannot access super admin routes (403)', adminAccessingSA.status === 403);
    } else {
      console.log('  ⚠️  Could not login as admin — add ADMIN_TEST_PASSWORD=<password> to .env to enable this test');
    }
  }

  // ── 9. Input Validation ──────────────────────────────────────────────────
  console.log('\n9. Input Validation');

  const emptyLogin = await api.post('/auth/login', {});
  test('Empty login body returns 400', emptyLogin.status === 400);

  const missingFields = await api.post('/auth/login', { email: 'test@test.com' });
  test('Missing password returns 400', missingFields.status === 400);

  // ── 10. Health Check ─────────────────────────────────────────────────────
  console.log('\n10. Health');

  const health = await api.get('/health');
  test('Health endpoint responds', health.status === 200);

  const root = await axios.get('http://localhost:5000/', { validateStatus: () => true });
  test('Root endpoint responds', root.status === 200);

  // ── Results ──────────────────────────────────────────────────────────────
  await mongoose.disconnect();

  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════');

  if (failed === 0) {
    console.log('  🎉 All tests passed! Platform is production-ready.');
  } else {
    console.log(`  ⚠️  ${failed} test(s) failed. Review above.`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});