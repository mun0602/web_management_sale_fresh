const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Định nghĩa dữ liệu các Plan tĩnh với giá mới và hạn mức AI mới
  const plansData = [
    {
      id: 'plan-3-days',
      name: 'Trial (3 ngày)',
      price: 50000,
      appleId: 'com.salekeyboard.trial.3d',
      googleId: 'com.salekeyboard.trial.3d',
      features: '1 Thiết bị,ai_limit:20,Quản lý nhóm'
    },
    {
      id: 'plan-1-month',
      name: 'Pro (1 tháng)',
      price: 500000,
      appleId: 'com.salekeyboard.pro.1m',
      googleId: 'com.salekeyboard.pro.1m',
      features: '2 Thiết bị,ai_limit:50,Quản lý nhóm'
    },
    {
      id: 'plan-3-months',
      name: 'Business (3 tháng)',
      price: 1000000,
      appleId: 'com.salekeyboard.business.3m',
      googleId: 'com.salekeyboard.business.3m',
      features: '3 Thiết bị,ai_limit:100,Quản lý nhóm'
    },
    {
      id: 'plan-6-months',
      name: 'Enterprise (6 tháng)',
      price: 1800000,
      appleId: 'com.salekeyboard.enterprise.6m',
      googleId: 'com.salekeyboard.enterprise.6m',
      features: '5 Thiết bị,ai_limit:200,Quản lý nhóm'
    },
    {
      id: 'plan-1-year',
      name: 'Premium (1 năm)',
      price: 2900000,
      appleId: 'com.salekeyboard.premium.1y',
      googleId: 'com.salekeyboard.premium.1y',
      features: 'Không giới hạn thiết bị,ai_unlimited,Quản lý nhóm'
    }
  ];

  // Kiểm tra xem cơ sở dữ liệu đã có dữ liệu chưa
  const adminCount = await prisma.user.count({
    where: { role: 'SUPER_ADMIN' }
  });

  if (adminCount > 0) {
    console.log('Database already seeded. Only updating plans...');
    for (const plan of plansData) {
      await prisma.plan.upsert({
        where: { id: plan.id },
        update: {
          name: plan.name,
          price: plan.price,
          appleId: plan.appleId,
          googleId: plan.googleId,
          features: plan.features
        },
        create: plan
      });
    }
    console.log('Plans updated successfully. Skipping other seeds.');
    return;
  }

  // 1. Clean database
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Admin user
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
      phone: '0901234567'
    }
  });
  console.log('Admin user created:', adminUser.email);

  // 3. Create Plans (sử dụng ID tĩnh)
  const createdPlans = {};
  for (const plan of plansData) {
    const createdPlan = await prisma.plan.create({
      data: plan
    });
    createdPlans[plan.id] = createdPlan;
  }
  console.log('Plans created');

  // 4. Create Users (Khách hàng)
  const usersData = [
    { email: 'nguyenvana@gmail.com', name: 'Nguyen Van A', phone: '0912345678', role: 'USER' },
    { email: 'tranvanb@gmail.com', name: 'Tran Van B', phone: '0987654321', role: 'USER' },
    { email: 'lethic@gmail.com', name: 'Le Thi C', phone: '0905556667', role: 'USER' },
    { email: 'phamvand@gmail.com', name: 'Pham Van D', phone: '0933334445', role: 'USER' },
    { email: 'hoangthie@gmail.com', name: 'Hoang Thi E', phone: '0944445556', role: 'USER' },
    { email: 'admin_support@example.com', name: 'Support Admin', phone: '0922223334', role: 'SUPPORT' },
    { email: 'admin_finance@example.com', name: 'Finance Admin', phone: '0955556668', role: 'FINANCE' }
  ];

  const createdUsers = [];
  const defaultUserPass = await bcrypt.hash('user123', 10);
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        password: defaultUserPass
      }
    });
    createdUsers.push(user);
  }
  console.log('Users created:', createdUsers.length);

  // 5. Create Subscriptions
  // Active sub for Nguyen Van A (1 Month)
  await prisma.subscription.create({
    data: {
      userId: createdUsers[0].id,
      planId: createdPlans['plan-1-month'].id,
      status: 'active',
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-07-01T00:00:00Z')
    }
  });

  // Active sub for Tran Van B (1 Year)
  await prisma.subscription.create({
    data: {
      userId: createdUsers[1].id,
      planId: createdPlans['plan-1-year'].id,
      status: 'active',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2027-01-01T00:00:00Z')
    }
  });

  // Expired sub for Le Thi C
  await prisma.subscription.create({
    data: {
      userId: createdUsers[2].id,
      planId: createdPlans['plan-1-month'].id,
      status: 'expired',
      startDate: new Date('2026-05-01T00:00:00Z'),
      endDate: new Date('2026-06-01T00:00:00Z')
    }
  });
  console.log('Subscriptions created');

  // 6. Create Payments & Generate Chart Timeseries
  const paymentsData = [
    { userId: createdUsers[0].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_APL_111111', date: '2026-06-01T10:00:00Z' },
    { userId: createdUsers[1].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Google Play', status: 'succeeded', transactionId: 'TX_GPL_222222', date: '2026-05-25T14:30:00Z' },
    { userId: createdUsers[2].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_APL_333333', date: '2026-05-01T08:15:00Z' },
    // Dữ liệu mô phỏng doanh thu 30 ngày qua
    { userId: createdUsers[3].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_REV_001', date: '2026-05-28T09:00:00Z' },
    { userId: createdUsers[4].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Google Play', status: 'succeeded', transactionId: 'TX_REV_002', date: '2026-05-31T11:00:00Z' },
    { userId: createdUsers[0].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Stripe', status: 'succeeded', transactionId: 'TX_REV_003', date: '2026-06-03T16:20:00Z' },
    { userId: createdUsers[1].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Stripe', status: 'succeeded', transactionId: 'TX_REV_004', date: '2026-06-06T10:10:00Z' },
    { userId: createdUsers[2].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Stripe', status: 'succeeded', transactionId: 'TX_REV_005', date: '2026-06-09T15:40:00Z' },
    { userId: createdUsers[3].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_REV_006', date: '2026-06-12T13:12:00Z' },
    { userId: createdUsers[4].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Google Play', status: 'succeeded', transactionId: 'TX_REV_007', date: '2026-06-15T09:05:00Z' },
    { userId: createdUsers[0].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_REV_008', date: '2026-06-18T14:45:00Z' },
    { userId: createdUsers[1].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Google Play', status: 'succeeded', transactionId: 'TX_REV_009', date: '2026-06-21T18:00:00Z' },
    { userId: createdUsers[2].id, amount: 500000, productName: 'Pro (1 tháng)', platform: 'Apple App Store', status: 'succeeded', transactionId: 'TX_REV_010', date: '2026-06-24T11:22:00Z' },
    // Một số giao dịch Refunded
    { userId: createdUsers[3].id, amount: 2900000, productName: 'Premium (1 năm)', platform: 'Stripe', status: 'refunded', transactionId: 'TX_REF_100', date: '2026-06-10T12:00:00Z' }
  ];

  for (const p of paymentsData) {
    await prisma.payment.create({
      data: {
        userId: p.userId,
        amount: p.amount,
        productName: p.productName,
        platform: p.platform,
        status: p.status,
        transactionId: p.transactionId,
        createdAt: new Date(p.date)
      }
    });
  }
  console.log('Payments created');

  // 7. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { timestamp: new Date('2026-06-24T10:00:00Z'), action: 'ADMIN_LOGIN', actor: 'admin@example.com', target: '-', details: 'Đăng nhập thành công', ip: '192.168.1.1' },
      { timestamp: new Date('2026-06-24T10:15:20Z'), action: 'UPDATE_PLAN', actor: 'admin@example.com', target: 'Plan #2', details: 'Đổi giá gói Premium 1Y từ 850k -> 899k', ip: '192.168.1.1' },
      { timestamp: new Date('2026-06-24T11:30:00Z'), action: 'LOCK_USER', actor: 'admin_support@example.com', target: 'User #1002', details: 'Khóa tài khoản do vi phạm chính sách spam', ip: '10.0.0.5' }
    ]
  });
  console.log('Audit logs created');

  console.log('Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
