import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "databaseManagement", // shown in Compass
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

/* ============================
   USER SCHEMA
============================ */
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  storageGB: { type: Number, default: 0 },
});

const User = mongoose.model("User", userSchema);

/* ============================
   PAYMENT SCHEMA
============================ */
const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // uid from User
  gb: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  upiLink: { type: String, required: true },
  status: { type: String, default: "PENDING" }, // PENDING | SUCCESS | FAILED
  createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);

/* ============================
   USER ROUTES
============================ */

// 🔹 Create/Get user when they log in with Google
app.post("/api/users", async (req, res) => {
  const { uid, name, email } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: "UID and email are required" });
  }
  try {
    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid, name, email });
      await user.save();
      return res.status(201).json({ message: "User created", user });
    }
    res.json({ message: "User already exists", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get user by UID
app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Update storage (when slider is used)
app.put("/api/users/:uid/storage", async (req, res) => {
  const { storageGB } = req.body; // e.g. { "storageGB": 6 }
  if (typeof storageGB !== "number") {
    return res.status(400).json({ error: "storageGB must be a number" });
  }
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { $inc: { storageGB } }, // increment by given amount
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "Storage updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   PAYMENT ROUTES
============================ */

// 🔹 Create payment intent
app.post("/api/payments", async (req, res) => {
  const { userId, gb, totalPrice, upiLink } = req.body;

  if (!userId || !gb || !totalPrice || !upiLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const payment = new Payment({ userId, gb, totalPrice, upiLink });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get all payments
app.get("/api/payments", async (req, res) => {
  try {
    const payments = await Payment.find();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Update payment status manually
app.put("/api/payments/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ROOT
============================ */
app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

/* ============================
   SERVER
============================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
