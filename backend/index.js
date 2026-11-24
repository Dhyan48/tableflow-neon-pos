require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/api/menu', async (req, res) => {
  const items = await prisma.menuItem.findMany({ orderBy: { id: 'asc' } });
  res.json(items);
});

app.post('/api/orders', async (req, res) => {
  const { tableNumber, items } = req.body;
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = await prisma.order.create({
    data: {
      tableNumber: Number(tableNumber),
      totalAmount,
      items: {
        create: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });
  res.status(201).json(order);
});

app.get('/api/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { menuItem: true } } },
  });
  res.json(orders);
});

app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await prisma.order.update({
    where: { id: Number(id) },
    data: { status },
  });
  res.json(updated);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));