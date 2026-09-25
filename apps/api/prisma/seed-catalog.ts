import { PrismaClient, ProductStatus, Visibility, ReviewStatus } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'burujan_minio_admin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'replace_with_strong_minio_secret_key',
  },
});

const BUCKET = process.env.S3_BUCKET || 'burujan';
const PUBLIC_BASE_URL = (process.env.S3_PUBLIC_URL || 'https://theburujan.shop/storage').replace(/\/$/, '');

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchBucket') {
      console.log(`Bucket ${BUCKET} not found, creating...`);
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      const policy = {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${BUCKET}/*`] }],
      };
      await s3.send(new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: JSON.stringify(policy) }));
    }
  }
}

async function uploadImageFromUrl(url: string, keySuffix: string, altText: string, adminId: string) {
  const existing = await prisma.media.findFirst({ where: { key: `media/products/${keySuffix}` } });
  if (existing) return existing;

  console.log(`  Downloading image for: ${altText}...`);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: status ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const key = `media/products/${keySuffix}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public,max-age=31536000,immutable',
  }));

  const mediaUrl = `${PUBLIC_BASE_URL}/${key}`;
  const media = await prisma.media.create({
    data: {
      key,
      url: mediaUrl,
      mimeType: 'image/jpeg',
      sizeBytes: buffer.length,
      originalName: keySuffix.split('/').pop() ?? 'image.jpg',
      altText,
      uploadedById: adminId,
      visibility: 'PUBLIC',
    },
  });
  return media;
}

async function main() {
  console.log('--- Starting Catalog Seeding ---');
  await ensureBucket();

  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
  });
  if (!admin) throw new Error('No SUPER_ADMIN user found in database. Seed admin first.');

  // Find or create customer user for reviews
  const customer = await prisma.user.upsert({
    where: { email: 'customer@theburujan.shop' },
    create: {
      email: 'customer@theburujan.shop',
      firstName: 'Alex',
      lastName: 'Morgan',
      passwordHash: admin.passwordHash,
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  // 1. Seed Brands
  console.log('Seeding brands...');
  const brandsData = [
    {
      name: 'Nitec Sound',
      slug: 'nitec-sound',
      description: 'Next-generation acoustic architecture and modern wearable audio gear.',
      website: 'https://nitec.theburujan.shop',
    },
    {
      name: 'Sequoia Audio',
      slug: 'sequoia-audio',
      description: 'Precision studio monitors and audiophile headphones designed for immersive sonic clarity.',
      website: 'https://sequoia.theburujan.shop',
    },
    {
      name: 'Aura Acoustics',
      slug: 'aura-acoustics',
      description: 'Minimalist Scandinavian industrial design with 360-degree acoustic performance.',
      website: 'https://aura.theburujan.shop',
    },
    {
      name: 'VisionTech',
      slug: 'visiontech',
      description: 'Pioneering spatial computing hardware, micro-OLED optics, and biometric wearables.',
      website: 'https://visiontech.theburujan.shop',
    },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { ...b, active: true },
      update: { name: b.name, description: b.description },
    });
    brandMap.set(b.slug, brand.id);
  }

  // 2. Seed Categories with Category Images
  console.log('Seeding categories...');
  const categoriesData = [
    {
      name: 'Over-Ear Headphones',
      slug: 'over-ear-headphones',
      description: 'Premium noise-cancelling studio and wireless headphones designed for all-day comfort.',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      sortOrder: 1,
    },
    {
      name: 'Wireless Earbuds',
      slug: 'wireless-earbuds',
      description: 'True wireless earbuds with active noise cancellation and compact charging cases.',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      sortOrder: 2,
    },
    {
      name: 'Spatial & Wearable Tech',
      slug: 'spatial-wearables',
      description: 'Next-generation mixed reality headsets with immersive spatial sound and displays.',
      imageUrl: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=800&auto=format&fit=crop&q=80',
      sortOrder: 3,
    },
    {
      name: 'Portable Audio',
      slug: 'portable-audio',
      description: 'High-fidelity Bluetooth speakers and compact room-filling sound systems.',
      imageUrl: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80',
      sortOrder: 4,
    },
    {
      name: 'Smart Living & Power',
      slug: 'smart-living',
      description: 'Precision engineered smartwatches and magnetic wireless power stations.',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      sortOrder: 5,
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categoriesData) {
    const categoryMedia = await uploadImageFromUrl(c.imageUrl, `category-${c.slug}.jpg`, `${c.name} Category`, admin.id);
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: categoryMedia.url,
        sortOrder: c.sortOrder,
        active: true,
      },
      update: {
        name: c.name,
        description: c.description,
        imageUrl: categoryMedia.url,
        sortOrder: c.sortOrder,
      },
    });
    categoryMap.set(c.slug, category.id);
  }

  // 3. Products
  console.log('Seeding products with high-resolution images...');
  const products = [
    {
      name: 'Sequoia Inspiring Musico Over-Ear Headphones',
      slug: 'sequoia-inspiring-musico-headphones',
      sku: 'SEQ-MUS-01',
      brandSlug: 'sequoia-audio',
      categorySlug: 'over-ear-headphones',
      basePrice: '299.0000',
      salePrice: '249.0000',
      costPrice: '110.0000',
      weightGrams: 285,
      shortDescription: 'Flagship wireless noise-cancelling headphones with studio-grade acoustics and 40h battery life.',
      description: 'Engineered for pure sonic immersion, the Sequoia Inspiring Musico delivers studio-grade acoustics through custom 45mm titanium composite drivers. Features adaptive hybrid noise cancellation, high-resolution wireless streaming, and plush breathable protein-leather memory foam cushions that remain comfortable through 40 hours of continuous playback.',
      tags: ['headphones', 'wireless', 'anc', 'featured', 'bestseller'],
      soldCount: 184,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=85',
          altText: 'Sequoia Inspiring Musico in Royal Blue',
          key: 'sequoia-musico-blue.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200&auto=format&fit=crop&q=85',
          altText: 'Sequoia Musico Studio Profile',
          key: 'sequoia-musico-profile.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Royal Blue', 'Matte Black', 'Space Grey'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'The cleanest soundstage I have ever experienced',
          body: 'The active noise cancellation blocks everything on flights, and the titanium drivers reproduce orchestral separation effortlessly. Battery life is easily 40+ hours.',
        },
        {
          rating: 5,
          title: 'Gorgeous design and unbelievable comfort',
          body: 'Memory foam pads are so soft they do not pinch my glasses at all. The blue finish looks even better in person than online.',
        },
        {
          rating: 4,
          title: 'Exceptional build quality',
          body: 'Sound quality is unmatched. The companion app connects instantly and the physical tactile switches feel substantial.',
        },
      ],
    },
    {
      name: 'Light Grey Surface Studio Headphone',
      slug: 'light-grey-surface-studio-headphone',
      sku: 'NIT-SURF-02',
      brandSlug: 'nitec-sound',
      categorySlug: 'over-ear-headphones',
      basePrice: '349.0000',
      salePrice: '299.0000',
      costPrice: '135.0000',
      weightGrams: 290,
      shortDescription: 'Boosted bass studio monitor headphones with intuitive tactile dial controls.',
      description: 'Designed for discerning audio creators, the Light Grey Surface Studio features boosted dynamic bass response, ultra-low distortion neodymium drivers, and omnidirectional dual microphones for crystal-clear calls. Seamless capacitive touch dials let you adjust volume and noise transparency on the fly.',
      tags: ['studio', 'headphones', 'bass-boost', 'featured'],
      soldCount: 122,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200&auto=format&fit=crop&q=85',
          altText: 'Light Grey Surface Studio Headphone',
          key: 'surface-studio-grey.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1200&auto=format&fit=crop&q=85',
          altText: 'Surface Studio on Acoustic Stand',
          key: 'surface-studio-stand.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Light Grey', 'Polar White'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Dial controls are a game-changer',
          body: 'Rotating the outer ear-cup dial to adjust transparency is vastly superior to fiddly buttons. Bass is deep without drowning mid-tones.',
        },
        {
          rating: 4,
          title: 'Premium studio reference monitor',
          body: 'Clean, accurate, and comfortable for 6-hour mixing sessions. Highly recommended.',
        },
      ],
    },
    {
      name: 'New Gen X-Bud True Wireless Earbuds',
      slug: 'new-gen-x-bud-earbuds',
      sku: 'NIT-XBUD-03',
      brandSlug: 'nitec-sound',
      categorySlug: 'wireless-earbuds',
      basePrice: '179.0000',
      salePrice: '139.0000',
      costPrice: '52.0000',
      weightGrams: 48,
      shortDescription: 'Next-gen true wireless earbuds with hybrid ANC and compact charging case.',
      description: 'Ultra-compact ergonomic true wireless earbuds featuring 3-stage active noise cancellation, ceramic acoustic chambers, and wireless Qi pebble charging. With IPX7 sweat and rain resistance and touch gesture controls, the X-Bud is built for everyday commutes and intense workouts alike.',
      tags: ['earbuds', 'wireless', 'tws', 'featured', 'waterproof', 'bestseller'],
      soldCount: 340,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200&auto=format&fit=crop&q=85',
          altText: 'New Gen X-Bud in Pebble Case',
          key: 'xbud-pebble-case.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=1200&auto=format&fit=crop&q=85',
          altText: 'New Gen X-Bud Earbud Detail',
          key: 'xbud-detail.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Ceramic White', 'Midnight Black'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Fit stays locked in during marathons',
          body: 'Never fallen out during my morning runs. The transparency mode lets me stay aware of traffic while listening to podcasts.',
        },
        {
          rating: 5,
          title: 'Case is featherweight and charges quickly',
          body: '10 minutes in the case gives you almost 2 hours of playback. Love the tactile magnetic snap when closing.',
        },
      ],
    },
    {
      name: 'VisionPro Spatial Audio XR Headset',
      slug: 'visionpro-spatial-audio-xr-headset',
      sku: 'VIS-XR-04',
      brandSlug: 'visiontech',
      categorySlug: 'spatial-wearables',
      basePrice: '899.0000',
      salePrice: '799.0000',
      costPrice: '420.0000',
      weightGrams: 460,
      shortDescription: 'Next-generation mixed reality headset with micro-OLED optics and spatial sound.',
      description: 'Step into seamless spatial computing. Dual custom micro-OLED 4K displays per eye provide unmatched visual clarity, while dual-driver audio pods beam 3D spatial audio directly to your ears while maintaining ambient awareness. Includes precision optical eye tracking and sub-millimeter hand gesture tracking.',
      tags: ['vr', 'spatial-audio', 'xr', 'featured'],
      soldCount: 68,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=1200&auto=format&fit=crop&q=85',
          altText: 'VisionPro Spatial Headset Front Visor',
          key: 'visionpro-front.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&auto=format&fit=crop&q=85',
          altText: 'VisionPro Optical Interface View',
          key: 'visionpro-optical.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Storage',
          values: ['256GB', '512GB'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'The future of computing and media consumption',
          body: 'Watching 4K movies in a virtual cinema with spatial audio makes you feel like you are sitting in an IMAX theatre.',
        },
      ],
    },
    {
      name: 'Cube Ambient Sound 360° Speaker',
      slug: 'cube-ambient-sound-speaker',
      sku: 'AUR-CUBE-05',
      brandSlug: 'aura-acoustics',
      categorySlug: 'portable-audio',
      basePrice: '129.0000',
      salePrice: '99.0000',
      costPrice: '38.0000',
      weightGrams: 520,
      shortDescription: 'Minimalist desktop cube speaker with 360° room acoustics and warm ambient light.',
      description: 'A sculptural geometric cube that combines omnidirectional room-filling acoustic performance with subtle, warm ambient under-glow. Pair two units wirelessly for true stereo sound separation. Up to 18 hours of playtime on a single charge.',
      tags: ['speaker', 'ambient', 'bluetooth', 'home-audio'],
      soldCount: 95,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=1200&auto=format&fit=crop&q=85',
          altText: 'Cube Ambient Sound Speaker',
          key: 'cube-speaker-ambient.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&auto=format&fit=crop&q=85',
          altText: 'Cube Speaker on Wooden Workspace',
          key: 'cube-speaker-desk.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Matte Black', 'Warm Sand'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Looks like art on my desk',
          body: 'Warm ambient glow is lovely in the evenings, and the sound is remarkably rich for its compact footprint.',
        },
      ],
    },
    {
      name: 'Pulse Pocket Wireless Speaker',
      slug: 'pulse-pocket-wireless-speaker',
      sku: 'NIT-PULS-06',
      brandSlug: 'nitec-sound',
      categorySlug: 'portable-audio',
      basePrice: '89.0000',
      salePrice: '69.0000',
      costPrice: '24.0000',
      weightGrams: 210,
      shortDescription: 'Pocket-sized aluminum acoustic disc engineered for on-the-go audiophiles.',
      description: 'Machined from an aerospace-grade solid aluminum unibody, the Pulse Pocket Speaker fits easily into your pocket while projecting surprisingly punchy, resonant bass. IP67 waterproof and dustproof with a braided nylon lanyard.',
      tags: ['portable', 'speaker', 'waterproof', 'outdoors'],
      soldCount: 145,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1200&auto=format&fit=crop&q=85',
          altText: 'Pulse Pocket Wireless Speaker',
          key: 'pulse-speaker-disc.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=1200&auto=format&fit=crop&q=85',
          altText: 'Pulse Pocket Speaker Angle',
          key: 'pulse-speaker-angle.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Obsidian', 'Pacific Blue'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Packs serious punch for its size',
          body: 'Took this on a weekend camping trip. Dropped it in a shallow stream and it never skipped a beat.',
        },
      ],
    },
    {
      name: 'Orbital Precision Smartwatch',
      slug: 'orbital-precision-smartwatch',
      sku: 'VIS-ORB-07',
      brandSlug: 'visiontech',
      categorySlug: 'smart-living',
      basePrice: '299.0000',
      salePrice: '249.0000',
      costPrice: '98.0000',
      weightGrams: 52,
      shortDescription: 'Precision titanium smartwatch with sapphire crystal display and ECG biometrics.',
      description: 'Aerospace-grade titanium casing, scratch-resistant sapphire crystal touch display, and advanced biometric sensors for continuous ECG, blood oxygen, and sleep architecture tracking. Water resistant to 50 meters with 7-day battery life.',
      tags: ['smartwatch', 'wearable', 'biometrics', 'fitness'],
      soldCount: 130,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=85',
          altText: 'Orbital Precision Smartwatch on Pedestal',
          key: 'orbital-smartwatch-hero.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=1200&auto=format&fit=crop&q=85',
          altText: 'Orbital Smartwatch OLED Interface',
          key: 'orbital-smartwatch-display.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Case',
          values: ['Space Grey Titanium', 'Silver Aluminum'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Accurate sensors and stunning screen',
          body: 'Battery easily lasts a full week without charging. The titanium finish has not picked up a single scratch.',
        },
      ],
    },
    {
      name: 'Aura Magnetic Wireless Power Dock',
      slug: 'aura-magnetic-power-dock',
      sku: 'AUR-DOCK-08',
      brandSlug: 'aura-acoustics',
      categorySlug: 'smart-living',
      basePrice: '69.0000',
      salePrice: '49.0000',
      costPrice: '16.0000',
      weightGrams: 180,
      shortDescription: 'Premium magnetic wireless charging dock crafted from weighted anodized aluminum.',
      description: 'Crafted from weighted anodized aluminum and soft-touch matte silicone. Magnetic Qi2 wireless charging delivers fast 15W charging with optimal thermal dissipation, keeping your workspace tidy and your devices charged.',
      tags: ['accessories', 'wireless-charging', 'dock', 'fast-charge'],
      soldCount: 210,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=1200&auto=format&fit=crop&q=85',
          altText: 'Aura Magnetic Wireless Power Dock',
          key: 'aura-power-dock.jpg',
          featured: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1200&auto=format&fit=crop&q=85',
          altText: 'Aura Power Dock Minimalist Setup',
          key: 'aura-dock-setup.jpg',
          featured: false,
        },
      ],
      attributes: [
        {
          name: 'Finish',
          values: ['Anodized Slate', 'Matte White'],
        },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Strong magnet and fast charging',
          body: 'Heavy base means you can lift your phone off without the dock lifting off the nightstand. Perfect bedside charger.',
        },
      ],
    },
  ];

  for (const p of products) {
    console.log(`Processing product: ${p.name}...`);
    const brandId = brandMap.get(p.brandSlug);
    const categoryId = categoryMap.get(p.categorySlug);

    // Upload product images
    const uploadedImages: { mediaId: string; url: string; altText: string; featured: boolean; sortOrder: number }[] = [];
    let sortOrder = 0;
    for (const img of p.images) {
      const media = await uploadImageFromUrl(img.url, `${p.slug}-${img.key}`, img.altText, admin.id);
      uploadedImages.push({
        mediaId: media.id,
        url: media.url,
        altText: img.altText,
        featured: img.featured,
        sortOrder: sortOrder++,
      });
    }

    // Upsert product
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        currency: 'USD',
        weightGrams: p.weightGrams,
        status: ProductStatus.ACTIVE,
        visibility: Visibility.PUBLIC,
        brandId,
        soldCount: p.soldCount,
        averageRating: p.reviews.length ? (p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length).toFixed(2) : '5.00',
        reviewCount: p.reviews.length,
      },
      update: {
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        brandId,
        soldCount: p.soldCount,
        averageRating: p.reviews.length ? (p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length).toFixed(2) : '5.00',
        reviewCount: p.reviews.length,
      },
    });

    // Link category
    if (categoryId) {
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId } },
        create: { productId: product.id, categoryId },
        update: {},
      });
    }

    // Link tags
    for (const tagName of p.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {},
      });
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId: tag.id } },
        create: { productId: product.id, tagId: tag.id },
        update: {},
      });
    }

    // Link product images
    // Clean old images for idempotency
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const img of uploadedImages) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          mediaId: img.mediaId,
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder,
          featured: img.featured,
        },
      });
    }

    // Attributes and Variants
    for (const attr of p.attributes) {
      const productAttr = await prisma.productAttribute.upsert({
        where: { productId_name: { productId: product.id, name: attr.name } },
        create: { productId: product.id, name: attr.name, sortOrder: 0 },
        update: {},
      });

      for (const [vIdx, valStr] of attr.values.entries()) {
        const attrVal = await prisma.productAttributeValue.upsert({
          where: { attributeId_value: { attributeId: productAttr.id, value: valStr } },
          create: { attributeId: productAttr.id, value: valStr, sortOrder: vIdx },
          update: {},
        });

        const variantSku = `${p.sku}-${valStr.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`;
        const combinationKey = `${attr.name}=${valStr}`;

        const variant = await prisma.productVariant.upsert({
          where: { productId_combinationKey: { productId: product.id, combinationKey } },
          create: {
            productId: product.id,
            sku: variantSku,
            price: p.basePrice,
            salePrice: p.salePrice,
            combinationKey,
            active: true,
          },
          update: {
            price: p.basePrice,
            salePrice: p.salePrice,
            active: true,
          },
        });

        // Link variant attribute value
        await prisma.variantAttributeValue.upsert({
          where: { variantId_valueId: { variantId: variant.id, valueId: attrVal.id } },
          create: { variantId: variant.id, valueId: attrVal.id },
          update: {},
        });

        // Inventory
        await prisma.inventory.upsert({
          where: { variantId: variant.id },
          create: {
            variantId: variant.id,
            available: 45,
            reserved: 0,
            sold: 15,
            lowStockThreshold: 5,
          },
          update: {
            available: 45,
          },
        });
      }
    }

    // Reviews
    for (const r of p.reviews) {
      await prisma.review.create({
        data: {
          productId: product.id,
          userId: customer.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: ReviewStatus.APPROVED,
          verifiedPurchase: true,
          helpfulCount: Math.floor(Math.random() * 12) + 2,
        },
      });
    }
  }

  // 4. Update Hero Banner Setting
  const heroProduct = await prisma.product.findUnique({
    where: { slug: 'sequoia-inspiring-musico-headphones' },
    include: { images: { where: { featured: true } } },
  });

  if (heroProduct && heroProduct.images[0]) {
    console.log('Setting hero banner to Sequoia Musico...');
    const heroSettings = [
      { key: 'homeHeroImage', value: heroProduct.images[0].url },
      { key: 'homeHeroImageAlt', value: 'Sequoia Inspiring Musico Flagship Wireless Headphones' },
      { key: 'homeHeroEyebrow', value: 'New Sound Horizon' },
      { key: 'homeHeroTitle', value: 'Sequoia Inspiring Musico.' },
      { key: 'homeHeroDescription', value: 'Making your dream soundscape reality with pure acoustic architecture and hybrid active noise cancellation.' },
      { key: 'homeHeroButton', value: 'Explore All Audio' },
      { key: 'homeHeroLink', value: '/shop' },
      { key: 'announcementEnabled', value: true },
      { key: 'announcementText', value: 'Complimentary Express Delivery on all flagship audio orders' },
    ];

    for (const s of heroSettings) {
      await prisma.setting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value, isPublic: true, updatedById: admin.id },
        update: { value: s.value, isPublic: true },
      });
    }
  }

  console.log('--- Catalog Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
