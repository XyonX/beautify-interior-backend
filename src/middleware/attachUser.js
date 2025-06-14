const jwt = require("jsonwebtoken");

const attachUser = (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.status === "active") {
      req.user = decoded;
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error("JWT verification error:", error);
    req.user = null;
  }

  next();
};

module.exports = attachUser;
