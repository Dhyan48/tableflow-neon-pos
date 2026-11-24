const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.menuItem.createMany({
    data: [
      { name: 'Paneer Tikka', category: 'Starters', price: 240 },
      { name: 'Crispy Corn', category: 'Starters', price: 180 },
      { name: 'Hyderabadi Veg Biryani', category: 'Mains', price: 280 },
      { name: 'Butter Naan & Dal Makhani', category: 'Mains', price: 260 },
      { name: 'Masala Dosa', category: 'Mains', price: 120 },
      { name: 'Fresh Lime Soda', category: 'Beverages', price: 90 },
      { name: 'Filter Coffee', category: 'Beverages', price: 60 },
      { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 100 },
    ],
  });
  console.log('Seeded restaurant menu items successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());