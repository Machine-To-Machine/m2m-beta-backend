import { Web5 } from "@web5/api";
import { DidDht, DidJwk } from "@web5/dids";
import DID from "../models/didModel.js";
import { webcrypto } from "node:crypto";

// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

/**
 * Creates a record using Web5 DWN
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createRecord = async (req, res) => {
  try {
    const { web5, did: aliceDid } = await web5.connect();
    const { record } = await web5.dwn.records.create({
      data: "Hello, Web5!",
      message: {
        dataFormat: "text/plain",
      },
    });

    const readResult = await record.data.text();
    res.status(200).json({
      status: "success",
      data: readResult,
    });
  } catch (error) {
    console.error("Error creating record:", error.message);
    res.status(500).json({ status: 'error', message: "Failed to create record" });
  }
};

/**
 * Updates a record using Web5 DWN
 * @param {string} recordId - ID of the record to update
 * @returns {Promise<string>} - Updated record data
 */
export const updateRecord = async (recordId) => {
  try {
    if (!recordId) throw new Error("Record ID is required");

    const { web5, did: aliceDid } = await web5.connect();
    const { record } = await web5.dwn.records.update({
      id: recordId,
      data: "Hello, Web5! Updated!",
      message: {
        dataFormat: "text/plain",
      },
    });

    const readResult = await record.data.text();
    return readResult;
  } catch (error) {
    console.error("Error updating record:", error.message);
    throw new Error("Failed to update record");
  }
};

export const deleteRecord = async (recordId) => {
  // write web5 did
  const { web5, did: aliceDid } = await web5.connect();
  await web5.dwn.records.delete({
    id: recordId,
  });

  return "Record deleted";
};

/**
 * Creates a new DID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createDid = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ status: "error", message: "Valid name is required" });
    }

    const did = await DidDht.create({ publish: true });

    const findDid = await DID.findOne({ uri: did.uri });
    if (findDid) {
      return res.status(409).json({ status: "error", message: "DID already exists" });
    }

    const newDid = new DID({
      name: name.trim(),
      uri: did.uri,
      document: did.document,
      register: req.rootUserId,
      did: did,
      status: "Created",
    });
    await newDid.save();

    res.status(201).json({ status: "success", data: { uri: did.uri } });
  } catch (error) {
    console.error("Error creating DID:", error.message);
    res.status(500).json({ status: "error", message: "Failed to create DID" });
  }
};

export const getDidByUser = async (req, res) => {
  try {
    const dids = await DID.find({ user: req.rootUserId }).sort({
      createdAt: -1,
    });
    res.send({ status: "success", data: dids });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", message: error });
  }
};

export const getDidByUri = async (req, res) => {
  try {
    const { uri } = req.body;

    if (!uri || typeof uri !== 'string') {
      return res.status(400).json({ status: "error", message: "Valid URI is required" });
    }

    const did = await DID.findOne({ uri: uri });
    if (!did) {
      return res.status(404).json({ status: "error", message: "DID not found" });
    }

    res.status(200).json({ status: "success", data: did });
  } catch (error) {
    console.error("Error fetching DID:", error.message);
    res.status(500).json({ status: "error", message: "Failed to fetch DID" });
  }
};

export const removeDid = async (req, res) => {
  try {
    const { uri } = req.body;
    await DID.deleteOne({ uri: uri });
    res.send({ status: "success", message: "DID deleted successfully!" });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", message: error });
  }
};

export const updateDid = async (req, res) => {
  try {
    const { uri } = req.body;

    if (!uri || typeof uri !== 'string') {
      return res.status(400).json({ status: "error", message: "Valid URI is required" });
    }

    const updatedDid = await DidDht.resolve(uri);

    const did = await DID.findOne({ uri: uri });
    if (!did) {
      return res.status(404).json({ status: "error", message: "DID not found" });
    }

    did.document = updatedDid.document;
    await did.save();
    res.status(200).json({ status: "success", data: { uri: updatedDid.uri } });
  } catch (error) {
    console.error(`Error updating DID: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to update DID"
    });
  }
};

export const apiTester = async (req, res) => {
  try {
    res.send({
      status: "success",
      message: "API is working!",
    });
  } catch (e) {
    res.send({
      status: "error",
      message: "API is not working!",
    });
  }
};

//DID Search
export const searchDids = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ status: "error", message: "Valid search query is required" });
    }

    // Limit query length to prevent RegEx DoS
    const sanitizedQuery = query.substring(0, 100);

    const dids = await DID.find({
      name: { $regex: sanitizedQuery, $options: "i" },
    }).limit(50); // Prevent excessive results

    const names = dids.map(did => did.name);

    res.status(200).json({
      status: "success",
      data: dids,
      message: "DIDs found successfully"
    });
  } catch (error) {
    console.error("Error in searchDid:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to search DIDs"
    });
  }
};

export const fetchAllDids = async (req, res) => {
  try {
    const dids = await DID.find();
    res.send({ status: "success", data: dids });
  } catch (error) {
    console.log(error);
    res.send({ status: "error", message: error });
  }
};
