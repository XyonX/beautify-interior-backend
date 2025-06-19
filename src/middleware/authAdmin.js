import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authAdmin = async (req, res, next) => {
  // Renamed for clarity
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Correct role check
    if (!["admin", "super_admin"].includes(decoded.role)) {
      res.clearCookie("authToken");
      return res
        .status(403)
        .json({ error: "Forbidden - Insufficient privileges" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("authToken");
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

export default authAdmin;
