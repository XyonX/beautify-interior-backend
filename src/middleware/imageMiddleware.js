import multer from "multer";
import path from "path";
import s3 from "../../config/r2client.js";
import { v4 as uuidv4 } from "uuid";

// Configure Multer with memory storage, file filter, and size limits
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware for category thumbnail
export const uploadCategoryThumbnail = upload.single("thumbnail");

// Middleware for product images (thumbnail and detailed images)
export const uploadProductImages = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "detailedImages", maxCount: 5 },
]);

// Helper function to upload a file to R2
const uploadToR2 = async (file, prefix) => {
  const fileExt = path.extname(file.originalname);
  const uniqueName = `${uuidv4()}${fileExt}`;
  const s3Key = `${prefix}/${uniqueName}`;

  await s3
    .putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    })
    .promise();

  return `/${s3Key}`;
};

// Upload category thumbnail to R2
export const uploadCategoryThumbnailToR2 = async (req, res, next) => {
  try {
    if (!req.file) return next(); // No file uploaded, proceed

    const file = req.file;
    const thumbnailUrl = await uploadToR2(file, "categories/thumbnails");
    req.body.thumbnail = thumbnailUrl;
    next();
  } catch (err) {
    console.error("Upload error:", err);
    next(err);
  }
};

// Upload product images (thumbnail and detailed images) to R2
export const uploadProductImagesToR2 = async (req, res, next) => {
  try {
    if (!req.files) {
      console.log("No detaiiled files uploaded");
      return next();
    }
    req.productImages = []; // Initialize array to hold image data

    // Upload product thumbnail
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];
      const thumbnailUrl = await uploadToR2(
        thumbnailFile,
        "products/thumbnails"
      );
      req.body.thumbnail = thumbnailUrl;
      req.productImages.push({
        url: thumbnailUrl,
        is_main: true, // Thumbnail is the main image
        alt_text: "Product thumbnail",
        sort_order: 0,
      });
    }

    // Upload product detailed images
    console.log("Detailed images received:", req.files.detailedImages);
    if (req.files.detailedImages) {
      for (let i = 0; i < req.files.detailedImages.length; i++) {
        const file = req.files.detailedImages[i];
        const url = await uploadToR2(file, "products/images");
        req.productImages.push({
          url,
          is_main: false,
          alt_text: `Product image ${i + 1}`,
          sort_order: i + 1,
        });
      }
    }
    console.log("Processed images:", req.productImages);

    next();
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload images to R2" });
  }
};
