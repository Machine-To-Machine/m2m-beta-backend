import { VerifiableCredential, PresentationExchange } from "@web5/credentials";
import { Web5 } from "@web5/api";
import { DidDht } from "@web5/dids";
import DID from "../models/didModel.js";
import VC from "../models/vcModel.js";
import Register from "../models/registerModel.js";
import { vcVerification } from "./templates/vcVerified.js";
import dotenv from "dotenv/config";
import { sendMail } from "./mailer.js";

export const createDid = async (data) => {
  try {
    if (!data || !data.name || !data.registerId) {
      return {
        status: false,
        data: null,
        message: "Missing required data",
      };
    }

    const { name, registerId, description, didType } = data;

    const findDid = await DID.findOne({ name: name });
    if (findDid) {
      return {
        status: false,
        data: null,
        message: "DID already exists!",
      };
    }

    const did = await DidDht.create({ publish: true });

    const newDid = new DID({
      name: name,
      uri: did.uri,
      document: did.document,
      register: registerId,
      did: did,
      description: description,
      type: didType,
      status: "Created",
    });

    await newDid.save();

    return {
      status: true,
      data: { uri: did.uri }, // Only return necessary data
      message: "DID created successfully!",
    };
  } catch (error) {
    console.error("Error creating DID:", error.message);
    return {
      status: false,
      data: null,
      message: "Failed to create DID",
    };
  }
};

export const createVC = async (data) => {
  try {
    if (!data || !data.type || !data.issuer || !data.subject || !data.email) {
      return {
        status: false,
        data: null,
        message: "Missing required data",
      };
    }

    const { type, issuer, subject, email, company, domainName, registerId } = data;

    let startDate = new Date().toISOString();
    startDate = startDate.split(".")[0] + "Z";
    let expirationDate = new Date(
      new Date().setMonth(new Date().getMonth() + 12)
    ).toISOString();
    expirationDate = expirationDate.split(".")[0] + "Z";

    const vc = await VerifiableCredential.create({
      type: type,
      issuer: issuer,
      subject: subject,
      expirationDate: expirationDate,
      data: {
        email: email,
        company: company,
        startDate: startDate,
        domain: domainName,
      },
    });

    const issuerDID = await DidDht.create({ publish: true });
    const signedVC = await vc.sign({ did: issuerDID });

    if (!vc.vcDataModel) {
      return {
        status: false,
        data: null,
        vcJwt: null,
        message: "VC not created!",
      };
    }

    const findVC = await VC.findOne({ uuid: vc.vcDataModel.id });
    if (findVC) {
      return {
        status: false,
        data: null,
        message: "VC already exists!",
      };
    }

    const newVC = new VC({
      uuid: vc.vcDataModel.id,
      issuer: issuer,
      subject: subject,
      issuanceDate: vc.vcDataModel.issuanceDate,
      expirationDate: expirationDate,
      type: vc.vcDataModel.type,
      credential: vc.vcDataModel.credentialSubject,
      user: registerId,
      did: issuer,
      vcJwt: signedVC,
      status: "UnVerified",
    });

    await newVC.save();

    return {
      status: true,
      data: {
        id: vc.vcDataModel.id,
        type: vc.vcDataModel.type,
        issuanceDate: vc.vcDataModel.issuanceDate,
        expirationDate: expirationDate,
      },
      vcJwt: signedVC,
      message: "VC created successfully!",
    };
  } catch (error) {
    console.error("Error creating VC:", error.message);
    return {
      status: false,
      data: null,
      message: "Failed to create verifiable credential",
    };
  }
};

export const signAndVerifyVC = async (data) => {
  try {
    if (!data || !data.vc) {
      return {
        status: false,
        data: null,
        message: "Missing required data",
      };
    }

    const { vc } = data;
    const did = await DidDht.create({ publish: true });
    const signedVcJwt = await vc.sign({ did: did });
    const verify = await VerifiableCredential.verify({ vcJwt: signedVcJwt });

    return {
      status: true,
      data: verify,
      message: "VC signed successfully!",
    };
  } catch (error) {
    console.error("Error signing and verifying VC:", error.message);
    return {
      status: false,
      data: null,
      message: "Failed to sign verifiable credential",
    };
  }
};

export const verifyVC = async (req, res) => {
  try {
    const { vcJwt, timestamp, email, uuid } = req.body;

    // Input validation
    if (!vcJwt || !email || !uuid) {
      return res.status(400).json({
        status: false,
        data: null,
        message: "Missing required data"
      });
    }

    // Check timestamp for request expiration
    if (timestamp) {
      const now = new Date().getTime();
      if (now - Number(timestamp) * 1000 > 30000) { // 30 seconds
        return res.status(400).json({
          status: false,
          data: null,
          message: "Request expired!",
        });
      }
    }

    const url = process.env.CLIENT_URL + "/profile?name=";
    const vc = await VerifiableCredential.verify({ vcJwt: vcJwt });

    const vcSubject = "Your code snippet has been verified.";
    const vcText = `Your code snippet has been verified.`;
    const vcHtml = vcVerification(url, uuid);

    await sendMail(email, vcSubject, vcText, vcHtml);

    res.status(200).json({
      status: true,
      data: { verified: true },
      message: "VC verified successfully!",
    });
  } catch (error) {
    console.error("Error verifying VC:", error.message);
    res.status(400).json({
      status: false,
      data: null,
      message: "Failed to verify credential",
    });
  }
};
