import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Register a new passenger
const registerPassenger = asyncHandler(async (req, res) => {
  const { name, email, phone, cnic, gender, dob, address, password } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !cnic ||
    !phone ||
    !address ||
    !gender ||
    !dob
  ) {
    throw new ApiError(400, "Please fill all required fields");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  const ifUserExists = await pool.query(
    'SELECT * FROM "passengers" WHERE email=$1',
    [email]
  );
  if (ifUserExists.rows.length) {
    throw new ApiError(400, "User already exists with this email");
  }
  try {
    const result = await pool.query(
      `INSERT INTO passengers (name, email, phone, cnic, gender, dob, address,password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, email, phone, cnic, gender, dob, address]
    );

    res
      .status(201)
      .json({ message: "Passenger registered", passenger: result.rows[0] });
  } catch (error) {
    console.error("Error registering passenger:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    // Step 1: Check if user exists
    const userResult = await pool.query(
      "SELECT * FROM passengers WHERE email = $1",
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Step 2: Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect old password" });
    }

    // Step 3: Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Step 4: Update password in database
    await pool.query("UPDATE passengers SET password = $1 WHERE email = $2", [
      hashedPassword,
      email,
    ]);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { registerPassenger, changePassword };
