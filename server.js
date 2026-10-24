
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const menu = {
  sandwich: { name: "Veg Sandwich", price: 40 },
  vadapav: { name: "Vada Pav", price: 20 },
  dosa: { name: "Masala Dosa", price: 50 },
  burger: { name: "Veg Burger", price: 60 },
  tea: { name: "Masala Tea", price: 15 },
  coffee: { name: "Cold Coffee", price: 35 }
};

const pickupTimes = [
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30"
];

const orders = [];
let nextId = 1001;

// Main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET: Food menu
app.get("/api/menu", (req, res) => {
  res.json({ menu, pickupTimes });
});

// POST: Validate and place order
app.post("/api/orders", (req, res) => {
  const { name, roll, pickup, items } = req.body || {};
  const errors = [];

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 50 ||
    !/^[A-Za-z ]+$/.test(name.trim())
  ) {
    errors.push("Enter a valid name using 2-50 letters.");
  }

  if (
    typeof roll !== "string" ||
    !/^[A-Za-z0-9-]{1,20}$/.test(roll.trim())
  ) {
    errors.push("Enter a valid roll number.");
  }

  if (!Array.isArray(items) || items.length < 1 || items.length > 6) {
    errors.push("Please add at least one food item.");
  }

  if (typeof pickup !== "string" || !pickupTimes.includes(pickup)) {
    errors.push("Please select a valid pickup time.");
  }

  const validatedItems = [];
  const seen = new Set();
  let total = 0;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (
        !item ||
        typeof item.foodId !== "string" ||
        !Object.hasOwn(menu, item.foodId)
      ) {
        errors.push("Invalid food item selected.");
        continue;
      }

      if (seen.has(item.foodId)) {
        errors.push("Duplicate food items are not allowed.");
        continue;
      }
      seen.add(item.foodId);

      if (!Number.isInteger(item.quantity) ||
          item.quantity < 1 || item.quantity > 10) {
        errors.push("Quantity must be between 1 and 10.");
        continue;
      }

      const food = menu[item.foodId];
      const subtotal = food.price * item.quantity;
      total += subtotal;

      validatedItems.push({
        foodId: item.foodId,
        name: food.name,
        price: food.price,
        quantity: item.quantity,
        subtotal
      });
    }
  }

  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  const order = {
    id: nextId++,
    name: name.trim(),
    roll: roll.trim(),
    pickup,
    items: validatedItems,
    total,
    status: "Confirmed",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.status(201).json({
    success: true,
    message: "Your order has been placed successfully!",
    order
  });
});

// GET: Order history
app.get("/api/orders", (req, res) => {
  res.json({ orders });
});

app.listen(PORT, () => {
  console.log(`CampusBite is running at http://localhost:${PORT}`);
});
