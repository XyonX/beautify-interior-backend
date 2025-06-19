import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authUser = async (req, res, next) => {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Correct
    next(); // Correct
  } catch (error) {
    res.clearCookie("authToken");
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

export default authUser;
