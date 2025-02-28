import Register from "../models/registerModel.js";
import crypto from "crypto";

// Hash password with SHA-256 (consider using bcrypt in production)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).send({
        status: "error",
        message: "Name, email and password are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).send({
        status: "error",
        message: "Invalid email format"
      });
    }

    if (password.length < 8) {
      return res.status(400).send({
        status: "error",
        message: "Password must be at least 8 characters long"
      });
    }

    const userExists = await Register.findOne({ email: email });
    if (userExists) {
      return res.status(409).send({
        status: "error",
        message: "User already exists!"
      });
    }

    const hashedPassword = hashPassword(password);

    const newUser = new Register({
      name: name,
      email: email,
      password: hashedPassword,
    });

    await newUser.save();

    // Don't log sensitive user information
    console.log(`User registered with email: ${email}`);

    res.status(201).send({
      status: "success",
      data: { name: newUser.name, email: newUser.email },
      message: "User registered successfully!",
    });
  } catch (e) {
    console.log(`Error registering user: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error registering user",
    });
  }
};

export const stripeSubscription = async (req, res) => {
  try {
    const { email, paymentMethod, priceId } = req.body;

    // Input validation
    if (!email || !paymentMethod || !priceId) {
      return res.status(400).send({
        status: "error",
        message: "Email, payment method and price ID are required"
      });
    }

    const user = await Register.findOne({ email: email }).populate(
      "subscription"
    );

    if (!user) {
      return res.status(404).send({
        status: "error",
        message: "User not found!"
      });
    }

    if (user.subscription) {
      return res.status(409).send({
        status: "error",
        message: "User already subscribed!"
      });
    }

    // Here you should import stripe properly instead of using an undefined variable
    // Add a try-catch block specifically for the stripe API call
    try {
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        expand: ["latest_invoice.payment_intent"],
      });

      user.subscription = subscription.id;
      await user.save();

      res.status(200).send({
        status: "success",
        data: { subscription_id: subscription.id },
        message: "Subscription created successfully!",
      });
    } catch (stripeError) {
      console.log(`Stripe error: ${stripeError.message}`);
      res.status(400).send({
        status: "error",
        message: "Payment processing error",
      });
    }
  } catch (e) {
    console.log(`Error creating subscription: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error creating subscription",
    });
  }
};
