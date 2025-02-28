import Register from "../models/registerModel.js";
import VC from "../models/vcModel.js";
import { sendMail } from "../utils/mailer.js";
import Stripe from "stripe";
import { verificationCode } from "../utils/templates/verificationCode.js";
import { createDid, createVC } from "../utils/web5.js";
import { codeSnippet } from "../utils/templates/codeSnippet.js";

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const issuerDID = process.env.ISSUER_DID;

// Input validation helpers
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateFields = (body, requiredFields) => {
  for (const field of requiredFields) {
    if (!body[field]) return false;
  }
  return true;
};

export const registerDev = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      companyName,
      description,
      webLink,
      linkedIn,
      github,
      huggingFace,
      domainName,
      extensionType,
      extensionName,
    } = req.body;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'domainName', 'extensionType'];
    if (!validateFields(req.body, requiredFields)) {
      return res.status(400).send({
        status: "error",
        message: "Missing required fields"
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).send({
        status: "error",
        message: "Invalid email format"
      });
    }

    // IMPORTANT: Don't comment out security checks
    const devExists = await Register.findOne({ email: email });
    if (devExists) {
      return res.status(409).send({
        status: "error",
        message: "Dev already exists!"
      });
    }

    const newDev = new Register({
      firstName: firstName,
      lastName: lastName,
      email: email,
      companyName: companyName,
      description: description,
      webLink: webLink,
      linkedIn: linkedIn,
      github: github,
      huggingFace: huggingFace,
      domainName: domainName,
      extensionType: extensionType,
      extensionName: extensionName,
    });

    await newDev.save();

    // Avoid logging full objects with sensitive data
    console.log(`Dev registered with email: ${email}`);

    res.status(201).send({
      status: "success",
      data: {
        id: newDev._id,
        email: newDev.email,
        domainName: newDev.domainName
      },
      message: "Dev registered successfully!",
    });
  } catch (e) {
    console.log(`Error registering dev: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error registering developer",
    });
  }
};

export const emailConfirm = async (req, res) => {
  try {
    const { email, domainName, extensionType } = req.body;

    if (!email || !domainName || !extensionType) {
      return res.status(400).send({
        status: "error",
        message: "Email, domain name and extension type are required"
      });
    }

    // Find dev by email and domain name
    const dev = await Register.findOne({
      email: email,
      domainName: domainName,
      extensionType: extensionType,
    });

    if (!dev) {
      return res.status(404).send({
        status: "error",
        message: "Developer not found with these credentials"
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000);
    dev.verificationCode = code;
    dev.verificationCodeExpires = Date.now() + parseInt(process.env.VERIFICATION_CODE_EXPIRY || 3600000); // Default 1 hour
    await dev.save();

    // Avoid logging sensitive codes
    console.log(`Verification code generated for ${email}`);

    const subject = "Machine to Machine email confirmation";
    const text = `Your verification code is: ${code}`;
    const html = verificationCode(code);
    const mailer = await sendMail(email, subject, text, html);

    if (!mailer) {
      return res.status(500).send({
        status: "error",
        message: "Error sending email!"
      });
    }

    res.status(200).send({
      status: "success",
      message: "Please check your email to confirm verification code",
    });
  } catch (e) {
    console.log(`Error confirming email: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error sending verification email",
    });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).send({
        status: "error",
        message: "Email and verification code are required"
      });
    }

    const dev = await Register.findOne({
      email: email,
      verificationCode: code,
    });

    if (!dev) {
      return res.status(400).send({
        status: "error",
        message: "Invalid verification code"
      });
    }

    // Proper expiry check using stored timestamp
    if (dev.verificationCodeExpires < Date.now()) {
      return res.status(400).send({
        status: "error",
        message: "Verification code expired"
      });
    }

    if (dev.verificationCode === Number(code) && Number(code) !== 0) {
      const customer = await createCustomer(dev.firstName, dev.email);

      if (!customer) {
        return res.status(500).send({
          status: "error",
          message: "Error creating customer!"
        });
      }

      dev.customerId = customer.id;
      dev.emailVerified = true;
      dev.verificationCode = 0; // Invalidate code after use for security
      await dev.save();

      const vc = await directSubscription(dev);

      if (vc !== "success") {
        return res.status(500).send({
          status: "error",
          message: "Error creating VC!"
        });
      }

      res.status(200).send({
        status: "success",
        data: vc,
        message: "User VC created successfully!",
      });
    } else {
      res.status(400).send({
        status: "error",
        message: "Invalid verification code!"
      });
    }
  } catch (e) {
    console.log(`Error verifying code: ${e.message}`);
    res.status(500).send({
      status: "error",
      message: "Error verifying code",
    });
  }
};

//create VC without payment confirm
export const directSubscription = async (dev) => {
  try {
    if (!dev) {
      console.log("Dev not found!");
      return;
    }

    let did = await createDid({
      registerId: dev._id,
      email: dev.email,
      name: dev.domainName + "." + dev.extensionName,
      description: dev.description,
      didType: dev.extensionType,
    });

    did = did.data;

    if (!did) {
      return null;
    }

    let vc = await createVC({
      type: dev.extensionType,
      issuer: issuerDID, // Use environment variable for issuer DID
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

    return "success";
  } catch (e) {
    console.log("Error creating VC:", e.message);
    return null;
  }
};

export const getUser = async (req, res) => {
  try {
    const { email, domainName, extensionType } = req.body;
    const dev = await Register.findOne({
      email: email,
      domainName: domainName,
      extensionType: extensionType,
    });
    if (!dev) {
      res.send({ status: "error", message: "Dev not found!" });
      return;
    }

    res.send({
      status: "success",
      data: {
        sessionId: dev.subscription.sessionId,
        customerId: dev.customerId,
      },
      message: "Dev fetched successfully!",
    });
  } catch (e) {
    console.log("Error fetching dev:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const subscriptionList = async (req, res) => {
  try {
    const subscriptions = await stripe.subscriptions.list();
    res.send({
      status: "success",
      data: subscriptions,
      message: "Subscriptions fetched successfully!",
    });
  } catch (e) {
    console.log("Error fetching subscriptions:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const createPrices = async (req, res) => {
  try {
    const { amount, currency, interval } = req.body;
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: currency,
      recurring: { interval: interval },
    });
    res.send({
      status: "success",
      data: price,
      message: "Price created successfully!",
    });
  } catch (e) {
    console.log("Error creating price:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { name } = req.body;
    console.log("name", name);
    const domainName = name.split(".")[0];
    const extensionType = name.split(".")[1] === "m"? "ai": "service";
    const dev = await Register.findOne({ domainName: domainName, extensionType: extensionType});
    if (!dev) {
      res.send({ status: "error", data: null, message: "Dev not found!" });
      return;
    }

    const vc = await VC.findOne({ user: dev._id });

    console.log("VC fetched:", vc);

    const profile = {
      firstName: dev.firstName,
      lastName: dev.lastName,
      email: dev.email,
      companyName: dev.companyName,
      description: dev.description,
      webLink: dev.webLink,
      linkedIn: dev.linkedIn,
      github: dev.github,
      huggingFace: dev.huggingFace,
      domainName: dev.domainName,
      extensionType: dev.extensionType,
      extensionName: dev.extensionName,
      vcJwt: vc.vcJwt || '',
      uuid: vc.uuid || '',
    };


    // const profile = await Register.findById(dev.user);
    // if (!profile) {
    //   res.send({ status: "error", data: null, message: "Profile not found!" });
    //   return;
    // }

    console.log("Dev fetched:", profile);

    res.send({
      status: "success",
      data: profile,
      message: "Profile fetched successfully!",
    });
  } catch (e) {
    console.log("Error fetching profile:", e.message);
    res.send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

// Safe customer creation without hardcoded values
const createCustomer = async (name, email) => {
  try {
    const customer = await stripe.customers.create({
      name: name,
      email: email,
    });
    return customer;
  } catch (e) {
    console.log(`Error creating customer: ${e.message}`);
    return null;
  }
};
