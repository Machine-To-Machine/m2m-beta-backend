import Register from "../models/registerModel.js";
import DID from "../models/didModel.js";
import Stripe from "stripe";
import { sendMail } from "../utils/mailer.js";
import { createDid, createVC } from "../utils/web5.js";
import { subscriptionTemplate } from "../utils/templates/subscription.js";
import { verificationCode } from "../utils/templates/verificationCode.js";
import { codeSnippet } from "../utils/templates/codeSnippet.js";

// Initialize Stripe with environment variable
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Move hardcoded values to environment variables in production
const prices = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID,
};

const couponID = process.env.STRIPE_COUPON_ID;
const issuerDID = process.env.ISSUER_DID;

// Input validation helpers
const validateRequired = (obj, fields) => {
  for (const field of fields) {
    if (!obj[field]) return false;
  }
  return true;
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, currency } = req.body;

    if (!validateRequired(req.body, ['name', 'description', 'price', 'currency'])) {
      return res.status(400).send({
        status: "error",
        message: "Missing required fields"
      });
    }

    const product = await stripe.products.create({
      name: name,
      description: description,
    });

    const prices = await stripe.prices.create({
      product: product.id,
      unit_amount: price,
      currency: currency,
      recurring: { interval: "year" },
    });

    res.status(201).send({
      status: "success",
      data: prices,
      message: "Product created successfully!",
    });
  } catch (e) {
    console.log(`Error creating product: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error creating product",
    });
  }
};

export const productList = async (req, res) => {
  try {
    const products = await stripe.products.list();
    res.send({
      status: "success",
      data: products.data,
      message: "Products fetched successfully!",
    });
  } catch (e) {
    console.log("Error fetching products:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const priceList = async (req, res) => {
  try {
    const prices = await stripe.prices.list();
    res.send({
      status: "success",
      data: prices.data,
      message: "Prices fetched successfully!",
    });
  } catch (e) {
    console.log("Error fetching prices:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const removeProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    await stripe.products.del(productId);
    res.send({
      status: "success",
      message: "Product deleted successfully!",
    });
  } catch (e) {
    console.log("Error deleting product:", e.message);
    res.send({
      status: "error",
      message: e.message,
    });
  }
};

const stripeSession = async (plan) => {
  return await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan,
        quantity: 1,
      },
    ],
    discounts: couponID ? [{ coupon: couponID }] : [],
    success_url: `${process.env.CLIENT_URL}/payment-success`,
    cancel_url: `${process.env.CLIENT_URL}?cancel=true`,
  });
};

export const createCoupon = async (req, res) => {
  try {
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "repeating",
      duration_in_months: 12,
      name: "FREE YEAR",
    });
    res.send({
      status: "success",
      data: coupon,
      message: "Coupon created successfully!",
    });
  } catch (e) {
    console.log("Error creating coupon:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { plan, customerId } = req.body;

    if (!plan || !customerId) {
      return res.status(400).send({
        status: "error",
        message: "Plan and customer ID are required"
      });
    }

    if (!prices[plan]) {
      return res.status(400).send({
        status: "error",
        message: "Invalid plan selected"
      });
    }

    const session = await stripeSession(prices[plan]);

    // Sanitize logging - avoid logging full session details
    console.log(`Session created with ID: ${session.id}`);

    try {
      const dev = await Register.findOne({ customerId: customerId });
      if (!dev) {
        return res.status(404).send({
          status: "error",
          message: "Customer not found!"
        });
      }

      dev.subscription = {
        sessionId: session.id,
      };
      await dev.save();

      res.status(200).send({
        status: "success",
        data: {
          id: session.id,
          url: session.url
        },
        message: "Session created successfully!",
      });
    } catch (dbError) {
      console.log(`Error updating subscription: ${dbError.message}`);
      // Still return the session even if DB update fails
      res.status(200).send({
        status: "warning",
        data: {
          id: session.id,
          url: session.url
        },
        message: "Session created but user record wasn't updated.",
      });
    }
  } catch (e) {
    console.log(`Error creating session: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error creating checkout session",
    });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const { sessionId, customerId } = req.body;
    console.log("Session ID:", sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Session:", session);
    if (session.payment_status === "paid") {
      const subscriptionId = session.subscription;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const planId = subscription.plan.id;
      const planType = subscription.plan.amount === 10 ? "basic" : "premium";
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const durationSeconds =
        subscription.current_period_end - subscription.current_period_start;
      const durationDays = durationSeconds / 86400;
      try {
        const dev = await Register.findOne({ customerId: customerId });
        if (!dev) {
          res.send({ status: "error", message: "Customer not found!" });
          return;
        }
        dev.subscription = {
          sessionId: sessionId,
          subscriptionId: subscriptionId,
          planId: planId,
          planType: planType,
          startDate: startDate,
          endDate: endDate,
          durationDays: durationDays,
        };
        await dev.save();

        //Email sending once payment is done
        const email = dev.email;
        const subject = "Machine to Machine purchase confirmation";
        const text = `Your subscription has been created successfully!`;
        const html = subscriptionTemplate;

        const mailer = await sendMail(email, subject, text, html);

        let did = await createDid({
          registerId: dev._id,
          email: dev.email,
          name: dev.domainName + "." + dev.extensionName,
          description: dev.description,
          didType: dev.extensionType,
        });

        did = did.data;
        console.log("DID created:", did);

        // const decenTrustDid = DID.findOne({ name: "DecenTrust" });
        // if (!decenTrustDid) {
        //   res.send({ status: "error", message: "DecenTrust DID not found!" });
        //   return;
        // }

        if (!did) {
          res.send({ status: "error", message: "DID not found!" });
          return;
        }

        let vc = await createVC({
          type: dev.extensionType,
          issuer: issuerDID, //DecenTrust DID
          subject: did.uri,
          email: dev.email,
          company: dev.companyName,
          domainName: dev.domainName + dev.extensionName,
          registerId: dev._id,
        });

        //Email sending once DID and VC are created
        const vcEmail = dev.email;
        const vcSubject = "Your credentials";
        const vcText = `Your credentials`;
        const vcHtml = codeSnippet(did, vc.data, vc.data.id, vc.vcJwt);

        const vcMailer = await sendMail(vcEmail, vcSubject, vcText, vcHtml);

        res.send({
          status: "success",
          message: "Subscription created successfully!",
          data: subscription,
        });
      } catch (e) {
        console.log("Error updating subscription:", e.message);
        res.send({
          status: "error",
          message: e.message,
          data: null,
        });
      }
    } else {
      res.send({
        status: "error",
        message: "Payment not completed!",
        data: null,
      });
    }
  } catch (e) {
    console.log("Error creating subscription:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, email } = req.body;
    const customer = await stripe.customers.create({
      name: name,
      email: email,
      payment_method: "pm_card_visa",
      invoice_settings: {
        default_payment_method: "pm_card_visa",
      },
    });
    res.send({
      status: "success",
      data: customer,
      message: "Customer created successfully!",
    });
  } catch (e) {
    console.log("Error creating customer:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const deleted = await stripe.subscriptions.del(subscriptionId);
    res.send({
      status: "success",
      message: "Subscription cancelled successfully!",
      data: deleted,
    });
  } catch (e) {
    console.log("Error cancelling subscription:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const emailTemplate = async (req, res) => {
  try {
    const { email, subject, text } = req.body;
    const html = verificationCode("000001");
    const mailer = await sendMail(email, subject, text, html);

    res.send({
      status: "success",
      data: mailer,
      message: "Email sent successfully!",
    });
  } catch (e) {
    console.log("Error creating email template:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};
