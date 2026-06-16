import jwt from "jsonwebtoken";

/**
 * Generate JWT token for authenticated user
 * Payload is intentionally minimal for security
 *
 * @param {Object} user
 * @param {string} user.id - UUID from users table
 * @param {string} user.email
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  if (!user?.id || !user?.email) {
    throw new Error("Invalid user data for token generation");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d" // practical for e-commerce
    }
  );
};

export default generateToken;
