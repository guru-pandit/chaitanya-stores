import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const categoryData = [
    {
      name: "Incense Sticks",
      slug: "incense-sticks",
      description: "Agarbatti in traditional and signature fragrances.",
    },
    {
      name: "Pooja Thali Items",
      slug: "pooja-thali-items",
      description: "Everything you need to assemble a complete pooja thali.",
    },
    {
      name: "Camphor",
      slug: "camphor",
      description: "Pure camphor tablets and cups for daily aarti.",
    },
    {
      name: "Dhoop & Cones",
      slug: "dhoop-cones",
      description: "Traditional dhoop sticks and cones for a rich, smoky fragrance.",
    },
  ];

  const categories = [];
  for (const c of categoryData) {
    categories.push(await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }));
  }

  const [incense, thali, camphor, dhoop] = categories;

  const products = [
    {
      name: "Sandalwood Agarbatti",
      slug: "sandalwood-agarbatti",
      description: "Classic sandalwood fragrance, 100 sticks per pack.",
      brand: "Cycle",
      weight: "100g (approx. 100 sticks)",
      sku: "CYC-SAND-100",
      price: 12000,
      images: JSON.stringify([]),
      inStock: true,
      featured: true,
      categoryId: incense.id,
      variants: {
        create: [
          { label: "50g", price: 6000, inStock: true },
          { label: "100g", price: 12000, inStock: true },
          { label: "250g", price: 28000, inStock: true },
        ],
      },
    },
    {
      name: "Rose Agarbatti",
      slug: "rose-agarbatti",
      description: "Soft floral rose fragrance for daily pooja.",
      brand: "Mangaldeep",
      weight: "80g (approx. 80 sticks)",
      sku: "MGD-ROSE-80",
      price: 9000,
      images: JSON.stringify([]),
      inStock: true,
      featured: false,
      categoryId: incense.id,
    },
    {
      name: "Nag Champa Agarbatti",
      slug: "nag-champa-agarbatti",
      description: "Signature champa blend, long-lasting burn.",
      brand: "Satya",
      weight: "90g (approx. 90 sticks)",
      sku: "SAT-CHAMPA-90",
      price: 11000,
      images: JSON.stringify([]),
      inStock: true,
      featured: true,
      categoryId: incense.id,
    },
    {
      name: "Brass Diya Set (Pair)",
      slug: "brass-diya-set-pair",
      description: "Traditional brass diyas, pair, for daily aarti and festivals.",
      brand: "Chaitanya Stores",
      weight: "2 pieces",
      sku: "CS-DIYA-PAIR",
      price: 45000,
      images: JSON.stringify([]),
      inStock: true,
      featured: true,
      categoryId: thali.id,
    },
    {
      name: "Kumkum & Chandan Box",
      slug: "kumkum-chandan-box",
      description: "Set of kumkum, chandan, and haldi in a compact box.",
      brand: "Chaitanya Stores",
      weight: "3 x 25g",
      sku: "CS-KCBOX-75",
      price: null,
      images: JSON.stringify([]),
      inStock: true,
      featured: false,
      categoryId: thali.id,
    },
    {
      name: "Camphor Tablets (100g)",
      slug: "camphor-tablets-100g",
      description: "Pure edible-grade camphor tablets for aarti.",
      brand: "Zed Black",
      weight: "100g",
      sku: "ZB-CAMPH-100",
      price: 8000,
      images: JSON.stringify([]),
      inStock: true,
      featured: false,
      categoryId: camphor.id,
    },
    {
      name: "Camphor Cups (Pack of 20)",
      slug: "camphor-cups-pack-of-20",
      description: "Convenient pre-measured camphor cups.",
      brand: "Zed Black",
      weight: "20 cups",
      sku: "ZB-CAMPH-CUP20",
      price: 6000,
      images: JSON.stringify([]),
      inStock: false,
      featured: false,
      categoryId: camphor.id,
    },
    {
      name: "Sambrani Dhoop Cones",
      slug: "sambrani-dhoop-cones",
      description: "Traditional sambrani cones for a rich, smoky fragrance.",
      brand: "Hem",
      weight: "12 cones",
      sku: "HEM-SAMB-12",
      price: 7000,
      images: JSON.stringify([]),
      inStock: true,
      featured: false,
      categoryId: dhoop.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@chaitanyastores.example";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, hashedPassword },
  });

  console.log("Seed complete.");
  console.log(`Admin login -> email: ${adminEmail} / password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
