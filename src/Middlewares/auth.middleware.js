import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");
    console.log("TOKEN: ", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token received");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("\nDecoded Token: ", decodedToken);

    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized request: Invalid token");
    }

    const result = await pool.query(
      `SELECT  * FROM "passengers" WHERE passenger_id = $1`, // Exclude password and refreshToken
      [decodedToken?.id]
    );
    // console.log(result);

    const passenger = result.rows[0];
    console.log(passenger?.role);

    if (!passenger) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = passenger;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access Token ");
  }
});

export const adminAuthMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

/*
jwt.verify() it will decode the token and verify its signature against the provided secret. If the verification is successful, it returns the decoded payload of the token.
{
  "userId": "12345",
  "username": "john_doe",
  "iat": 1609459200,
  "exp": 1609462800
}
By setting req.user = user, you make this user information available throughout the lifecycle of the request.

next();: This is a call to the next function, which is used in Express middleware to pass control to the next middleware function in the stack. Without this call, the request-response cycle would be halted, and the client would not receive a response.
*/
