// r2Client.js
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: "auto", // Cloudflare R2 requires "auto"
  signatureVersion: "v4",
});
export default s3;
