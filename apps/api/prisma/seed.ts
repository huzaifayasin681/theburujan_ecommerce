import { PrismaClient, ProductStatus } from '@prisma/client';
import * as argon2 from 'argon2';
const prisma = new PrismaClient();
const permissionKeys = ['products.create','products.read','products.update','products.delete','orders.read','orders.update','orders.cancel','orders.refund','users.read','users.update','users.suspend','inventory.read','inventory.update','coupons.create','coupons.update','coupons.delete','reviews.moderate','analytics.read','settings.read','settings.update','admins.manage','roles.manage','audit.read'];
async function seededUser(roleId: string, prefix: 'SUPER_ADMIN' | 'ADMIN' | 'USER') { const email = process.env[`SEED_${prefix}_EMAIL`]; const password = process.env[`SEED_${prefix}_PASSWORD`]; if (!email || !password) return null; if (password.length < 12) throw new Error(`SEED_${prefix}_PASSWORD must be at least 12 characters`); const user = await prisma.user.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase(), passwordHash: await argon2.hash(password), firstName: prefix === 'USER' ? 'Sample' : 'Store', lastName: prefix === 'USER' ? 'Customer' : prefix === 'ADMIN' ? 'Administrator' : 'Owner', emailVerifiedAt: new Date() }, update: {} }); await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId } }, create: { userId: user.id, roleId }, update: {} }); return user; }
async function main() {
  for (const key of permissionKeys) await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
  const superAdminRole = await prisma.role.upsert({ where: { name: 'SUPER_ADMIN' }, create: { name: 'SUPER_ADMIN', isSystem: true, description: 'Protected system owner' }, update: { isSystem: true } });
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, create: { name: 'ADMIN', isSystem: true, description: 'Permission-based administrator' }, update: { isSystem: true } });
  const userRole = await prisma.role.upsert({ where: { name: 'USER' }, create: { name: 'USER', isSystem: true }, update: { isSystem: true } });
  const permissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({ data: permissions.map(({ id }) => ({ roleId: superAdminRole.id, permissionId: id })), skipDuplicates: true });
  const adminPermissionKeys = permissionKeys.filter((key) => !['admins.manage', 'roles.manage'].includes(key));
  await prisma.rolePermission.createMany({ data: permissions.filter(({ key }) => adminPermissionKeys.includes(key)).map(({ id }) => ({ roleId: adminRole.id, permissionId: id })), skipDuplicates: true });
  const zone = await prisma.shippingZone.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Global Default Zone', countries: ['*'] },
    update: { name: 'Global Default Zone', countries: ['*'] },
  });
  await prisma.shippingMethod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', zoneId: zone.id, name: 'Standard Insured Courier (3-5 Business Days)', type: 'FLAT_RATE', basePrice: '0.0000' },
    update: { name: 'Standard Insured Courier (3-5 Business Days)', basePrice: '0.0000' },
  });
  await prisma.shippingMethod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: { id: '00000000-0000-0000-0000-000000000002', zoneId: zone.id, name: 'Express Air Courier (2-3 Business Days)', type: 'FLAT_RATE', basePrice: '15.0000' },
    update: { name: 'Express Air Courier (2-3 Business Days)', basePrice: '15.0000' },
  });
  await prisma.shippingMethod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    create: { id: '00000000-0000-0000-0000-000000000003', zoneId: zone.id, name: 'Next-Day White-Glove VIP Delivery', type: 'FLAT_RATE', basePrice: '29.0000' },
    update: { name: 'Next-Day White-Glove VIP Delivery', basePrice: '29.0000' },
  });
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SEED_SUPER_ADMIN_EMAIL && process.env.SEED_SUPER_ADMIN_PASSWORD) {
      await seededUser(superAdminRole.id, 'SUPER_ADMIN');
      console.log(`Seeded production super admin: ${process.env.SEED_SUPER_ADMIN_EMAIL}`);
    }
    return;
  }
  await seededUser(adminRole.id, 'ADMIN');
  const customer = await seededUser(userRole.id, 'USER');
  const brand = await prisma.brand.upsert({ where: { slug: 'burujan-studio' }, create: { name: 'Burujan Studio', slug: 'burujan-studio', description: 'Development catalog brand', active: true }, update: {} });
  const category = await prisma.category.upsert({ where: { slug: 'home-living' }, create: { name: 'Home & Living', slug: 'home-living', description: 'Development catalog category', active: true, sortOrder: 1 }, update: {} });
  const product = await prisma.product.upsert({ where: { sku: 'DEV-VASE' }, create: { name: 'Stoneware Vase', slug: 'stoneware-vase', sku: 'DEV-VASE', description: 'Hand-finished stoneware vase used for local development and integration testing.', shortDescription: 'A hand-finished stoneware vase.', basePrice: '49.9900', salePrice: '39.9900', costPrice: '18.0000', currency: process.env.STORE_CURRENCY ?? 'USD', status: ProductStatus.ACTIVE, visibility: 'PUBLIC', brandId: brand.id, categories: { create: { categoryId: category.id } }, variants: { create: { sku: 'DEV-VASE-SAND', combinationKey: 'Color=Sand', price: '49.9900', salePrice: '39.9900', inventory: { create: { available: 50, lowStockThreshold: 5 } } } } }, update: {} , include: { variants: true } });
  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, create: { code: 'WELCOME10', type: 'PERCENTAGE', value: '10', firstOrderOnly: true, perUserLimit: 1, active: true }, update: {} });
  if (customer && product.variants[0]) { const order = await prisma.order.upsert({ where: { idempotencyKey: 'development-seed-order-v1' }, create: { orderNumber: 'BRJ-DEV-000001', userId: customer.id, email: customer.email, status: 'DELIVERED', currency: process.env.STORE_CURRENCY ?? 'USD', subtotal: '39.9900', discountTotal: '0', taxTotal: '0', shippingTotal: '10', grandTotal: '49.9900', shippingAddress: { name: 'Sample Customer', phone: '+10000000000', country: 'US', state: 'CA', city: 'Sample City', postalCode: '90001', line1: '1 Development Way' }, billingAddress: { name: 'Sample Customer', phone: '+10000000000', country: 'US', state: 'CA', city: 'Sample City', postalCode: '90001', line1: '1 Development Way' }, idempotencyKey: 'development-seed-order-v1', items: { create: { productId: product.id, variantId: product.variants[0].id, productName: product.name, sku: product.variants[0].sku, variantSnapshot: {}, unitPrice: '39.9900', taxTotal: '0', discountTotal: '0', quantity: 1, lineTotal: '39.9900' } }, statusHistory: { create: [{ toStatus: 'CONFIRMED', notes: 'Development seed' }, { fromStatus: 'CONFIRMED', toStatus: 'DELIVERED', notes: 'Development seed' }] }, payments: { create: { provider: 'COD', transactionId: 'COD-BRJ-DEV-000001', idempotencyKey: 'development-seed-payment-v1', amount: '49.9900', currency: process.env.STORE_CURRENCY ?? 'USD', status: 'PAID' } } }, update: {} }); void order; }
}
main().finally(() => prisma.$disconnect());
