import { VerifiableCredential, PresentationExchange } from "@web5/credentials";
import VC from "../models/vcModel.js";
import { DidDht } from "@web5/dids";

// Validate input for VC creation
const validateVCInput = (body) => {
  const { type, issuer, subject, position, employmentStatus } = body;
  if (!type || !issuer || !subject || !position || !employmentStatus) {
    return false;
  }
  return true;
};

//create VCs
export const createVC = async (req, res) => {
  try {
    const { type, issuer, subject, position, employmentStatus } = req.body;

    // Input validation
    if (!validateVCInput(req.body)) {
      return res.status(400).send({
        status: "error",
        message: "Missing required fields for VC creation"
      });
    }

    let startDate = new Date().toISOString();
    startDate = startDate?.split(".")[0] + "Z";
    let expirationDate = new Date(
      new Date().setMonth(new Date().getMonth() + 1)
    ).toISOString();
    expirationDate = expirationDate?.split(".")[0] + "Z";

    const vc = await VerifiableCredential.create({
      type: type,
      issuer: issuer,
      subject: subject,
      expirationDate: expirationDate,
      data: {
        position: position,
        startDate: startDate,
        employmentStatus: employmentStatus,
      },
    });

    // Use an existing DID if possible instead of creating a new one each time
    const did = await DidDht.create({ publish: true });
    const signedVC = await vc.sign({ did: did });

    // Avoid logging sensitive data
    console.log('VC created successfully');

    // Store VC in database (uncomment and fix this section when needed)
    // const newVC = new VC({
    //   uuid: vc.vcDataModel.id,
    //   issuer: issuer,
    //   subject: subject,
    //   issuanceDate: vc.vcDataModel.issuanceDate,
    //   expirationDate: expirationDate,
    //   type: vc.vcDataModel.type,
    //   credential: vc.vcDataModel.credentialSubject,
    //   user: req.rootUserId,
    //   did: issuer,
    //   signedVC: signedVC,
    //   status: "UnVerified",
    // });
    // await newVC.save();

    res.status(200).send({
      status: "success",
      data: signedVC,
      message: "VC created successfully!",
    });
  } catch (e) {
    console.log(`Error creating VC: ${e.message}`);
    res.status(500).send({
      status: "error",
      data: null,
      message: e.message,
    });
  }
};

//Sign VCs
export const signVC = async (req, res) => {
  try {
    const { issuerDid, vc } = req.body;

    if (!issuerDid || !vc) {
      return res.status(400).send({
        status: "error",
        message: "Missing required fields for VC signing"
      });
    }

    const signedVcJwt = await vc.sign({ issuer: issuerDid });
    res.status(200).send({
      status: "success",
      data: signedVcJwt,
      message: "VC signed successfully!",
    });
  } catch (e) {
    console.log(`Error signing VC: ${e.message}`);
    res.status(500).send({
      status: "error",
      data: null,
      message: "Error signing VC!",
    });
  }
};

//verify VCs
export const verifyVC = async (req, res) => {
  try {
    const { signedVcJwt } = req.body;

    if (!signedVcJwt) {
      return res.status(400).send({
        status: "error",
        message: "Missing signed VC JWT"
      });
    }

    await VerifiableCredential.verify({ vcJwt: signedVcJwt });
    console.log("VC Verification successful!");
    res.status(200).send({
      status: "success",
      message: "VC Verification successful!",
    });
  } catch (e) {
    console.log(`VC Verification failed: ${e.message}`);
    res.status(400).send({
      status: "error",
      message: "VC Verification failed!",
    });
  }
};

// Parse JWT into VC
export const parseVC = async (req, res) => {
  try {
    const { signedVcJwt } = req.body;

    if (!signedVcJwt) {
      return res.status(400).send({
        status: "error",
        message: "Missing signed VC JWT"
      });
    }

    const vc = await VerifiableCredential.parseJwt({ vcJwt: signedVcJwt });
    res.status(200).send({
      status: "success",
      data: vc,
      message: "VC parsed successfully!",
    });
  } catch (e) {
    console.log(`Error parsing VC: ${e.message}`);
    res.status(400).send({
      status: "error",
      data: null,
      message: "Error parsing VC!",
    });
  }
};

// Get VC by user
export const getVCByUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send({
        status: "error",
        message: "User ID is required"
      });
    }

    const vcs = await VC.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).send({ status: "success", data: vcs });
  } catch (error) {
    console.log(`Error fetching VCs: ${error.message}`);
    res.status(500).send({ status: "error", message: error.message });
  }
};

// Remove VC
export const removeVC = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).send({
        status: "error",
        message: "VC ID is required"
      });
    }

    await VC.deleteOne({ id: id });
    res.status(200).send({ status: "success", message: "VC deleted successfully!" });
  } catch (error) {
    console.log(`Error removing VC: ${error.message}`);
    res.status(500).send({ status: "error", message: error.message });
  }
};
