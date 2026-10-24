
const cart = {};

const form = document.getElementById("orderForm");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const feedback = document.getElementById("feedback");
const submitButton = document.getElementById("submitOrder");
const historyContainer = document.getElementById("orderHistory");

const money = amount => `₹${amount}`;

function showMessage(message, type) {
  feedback.replaceChildren();

  const messages = Array.isArray(message) ? message : [message];

  messages.forEach(text => {
    const p = document.createElement("p");
    p.textContent = text;
    feedback.appendChild(p);
  });

  feedback.className = `feedback show ${type}`;
}

function renderCart() {
  cartItems.replaceChildren();

  const ids = Object.keys(cart);
  let count = 0;
  let total = 0;

  ids.forEach(id => {
    count += cart[id].quantity;
    total += cart[id].price * cart[id].quantity;
  });

  cartCount.textContent = `${count} item${count === 1 ? "" : "s"}`;
  cartTotal.textContent = money(total);

  if (ids.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-cart";
    empty.textContent = "Your cart is empty. Add something delicious!";
    cartItems.appendChild(empty);
    return;
  }

  ids.forEach(id => {
    const item = cart[id];
    const row = document.createElement("div");
    row.className = "cart-item";

    const details = document.createElement("div");
    const title = document.createElement("strong");
    const price = document.createElement("small");

    title.textContent = item.name;
    price.textContent =
      `${money(item.price)} × ${item.quantity} = ${money(item.price * item.quantity)}`;

    details.append(title, document.createElement("br"), price);

    const controls = document.createElement("div");
    controls.className = "quantity-control";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Remove one ${item.name}`);
    minus.addEventListener("click", () => changeQuantity(id, -1));

    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Add one ${item.name}`);
    plus.addEventListener("click", () => changeQuantity(id, 1));

    controls.append(minus, quantity, plus);
    row.append(details, controls);
    cartItems.appendChild(row);
  });
}

function changeQuantity(id, change) {
  const next = cart[id].quantity + change;

  if (next > 10) {
    showMessage("You can order up to 10 of each food item.", "error");
    return;
  }

  if (next <= 0) {
    delete cart[id];
  } else {
    cart[id].quantity = next;
  }

  feedback.className = "feedback";
  renderCart();
}

// Add buttons for all food cards
document.querySelectorAll("[data-add]").forEach(button => {
  button.addEventListener("click", async () => {
    const id = button.dataset.add;

    try {
      // Get the official menu price from the server
      const response = await fetch("/api/menu");

      if (!response.ok) {
        throw new Error("Menu request failed");
      }

      const data = await response.json();
      const food = data.menu[id];

      if (!food) {
        showMessage("This food item is unavailable.", "error");
        return;
      }

      if (cart[id] && cart[id].quantity >= 10) {
        showMessage("You can order up to 10 of each food item.", "error");
        return;
      }

      if (cart[id]) {
        cart[id].quantity += 1;
      } else {
        cart[id] = {
          name: food.name,
          price: food.price,
          quantity: 1
        };
      }

      feedback.className = "feedback";
      renderCart();

      document.getElementById("checkout").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      showMessage(
        "Cannot connect to the menu. Check that the new server is running.",
        "error"
      );
    }
  });
});

// Send the order to Node.js
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (Object.keys(cart).length === 0) {
    showMessage("Please add at least one food item.", "error");
    return;
  }

  if (!form.reportValidity()) return;

  const payload = {
    name: document.getElementById("name").value.trim(),
    roll: document.getElementById("roll").value.trim(),
    pickup: document.getElementById("pickup").value,
    items: Object.entries(cart).map(([foodId, item]) => ({
      foodId,
      quantity: item.quantity
    }))
  };

  submitButton.disabled = true;
  submitButton.textContent = "Placing order...";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      showMessage(result.errors || [result.message || "Order failed."], "error");
      return;
    }

    showMessage(
      `Order confirmed! ID: ${result.order.id}. Total: ${money(result.order.total)}. Pickup: ${result.order.pickup}.`,
      "success"
    );

    Object.keys(cart).forEach(id => delete cart[id]);
    form.reset();
    renderCart();
    await loadOrders();

  } catch (error) {
    showMessage(
      "Unable to contact the server. Please check that it is running.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Confirm Pre-Order →";
  }
});

// Load order history from the server
async function loadOrders() {
  try {
    const response = await fetch("/api/orders");

    if (!response.ok) throw new Error("Request failed");

    const data = await response.json();
    historyContainer.replaceChildren();

    if (!data.orders.length) {
      const empty = document.createElement("p");
      empty.className = "empty-history";
      empty.textContent = "No orders yet. Your orders will appear here.";
      historyContainer.appendChild(empty);
      return;
    }

    [...data.orders].reverse().forEach(order => {
      const card = document.createElement("article");
      card.className = "history-card";

      const details = document.createElement("div");
      const heading = document.createElement("h4");
      const description = document.createElement("p");
      const total = document.createElement("strong");

      heading.textContent = `Order #${order.id} — ${order.name}`;

      description.textContent =
        `${order.items.map(item => `${item.name} × ${item.quantity}`).join(", ")} | Pickup: ${order.pickup} | ${order.status}`;

      total.textContent = money(order.total);

      details.append(heading, description);
      card.append(details, total);
      historyContainer.appendChild(card);
    });

  } catch (error) {
    historyContainer.textContent =
      "Unable to load orders. Please check the server.";
  }
}

document.getElementById("refreshOrders")
  .addEventListener("click", loadOrders);

renderCart();
loadOrders();
