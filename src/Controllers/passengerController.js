import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer"; 

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

  const hashPassword = await bcrypt.hash(password, 10);

  // Get the local path of the uploaded photo
  const photoLocalPath = req.files?.profile_photo?.[0]?.path;
  if (!photoLocalPath) {
    throw new ApiError(400, "Profile photo is required");
  }

  let photo;

  try {
    // Upload the image to Cloudinary
    photo = await uploadOnCloudinary(photoLocalPath);
    console.log("Uploaded Photo URL:", photo.url);
  } catch (err) {
    console.log("Error uploading on Cloudinary", err);
    throw new ApiError(500, "Photo upload failed");
  }

  try {
    const result = await pool.query(
      `INSERT INTO passengers (name, email, phone, cnic, gender, dob, address, password, profile_photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, email, phone, cnic, gender, dob, address, hashPassword, photo.url]
    );

    res
      .status(201)
      .json({ message: "Passenger registered", passenger: result.rows[0] });
  } catch (error) {
    console.error("Error registering passenger:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Change password of a passenger
const changePassword = asyncHandler(async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  const userResult = await pool.query(
    "SELECT * FROM passengers WHERE email = $1",
    [email]
  );
  if (userResult.rows.length === 0) {
    throw new ApiError(404, "User not found");
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

  return res
    .status(201)
    .json(new ApiResponse(200, "Password Changed Successfully"));
});

// Login a passenger
const loginPassenger = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Please provide both email and password fields");
  }

  const checkIfUserIsRegistered = await pool.query(
    'SELECT * FROM "passengers" WHERE email=$1',
    [email]
  );
  if (checkIfUserIsRegistered.rows.length == 0) {
    throw new ApiError(400, "User not registered");
  }

  const checkPwd = await bcrypt.compare(
    password,
    checkIfUserIsRegistered.rows[0].password
  );
  if (!checkPwd) {
    throw new ApiError(400, "Passwords do not match");
  }

  const accessToken = jwt.sign(
    { id: checkIfUserIsRegistered.rows[0].user_id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: checkIfUserIsRegistered.rows[0].user_id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // storing refreshToken in DB
  await pool.query('UPDATE "passengers" SET refreshToken=$1 WHERE email=$2', [
    refreshToken,
    email,
  ]);

  const loggedInUser = await pool.query(
    'SELECT * FROM "passengers" WHERE email=$1',
    [email]
  );

  return res.status(200).json(
    new ApiResponse(200, {
      user: loggedInUser.rows[0],
      accessToken,
      refreshToken,
    })
  );
});

const forgotPasswordOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Please provide an email");
  }

  // Check if user exists
  const userResult = await pool.query('SELECT * FROM "passengers" WHERE email=$1', [email]);
  if (userResult.rows.length === 0) {
    throw new ApiError(400, "User not registered");
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes

  // Save OTP and expiration in the database
  await pool.query(
    'UPDATE "passengers" SET otp=$1, otp_expires_at=$2 WHERE email=$3',
    [otp, expiresAt, email]
  );

  // Email configuration
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset OTP",
    html: `<p>Your password reset OTP is: <b>${otp}</b></p>
           <p>This OTP is valid for 15 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new ApiError(500, "Email could not be sent");
  }
});
const resetPasswordWithOtp=asyncHandler(async(req,res)=>{
  const {email,newPassword,otp} = req.body;
  if (!email||!newPassword||!otp){
    throw new ApiError(400,"Please provide all fields")
  }
  const user= (await pool.query('SELECT * from "passengers" WHERE email=$1',[email])).rows[0];
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  
  if (user.otp !== otp || user.otp_expires_at < new Date()) {
    throw new ApiError(400, "Invalid OTP");}

  

  // Step 3: Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Step 4: Update password in database
  await pool.query("UPDATE passengers SET password = $1 WHERE email = $2", [
    hashedPassword,
    email,
  ]);

  return res
    .status(201)
    .json(new ApiResponse(200, "Password Reset Successfully"));

  


});
export { registerPassenger, changePassword, loginPassenger ,forgotPasswordOTP,resetPasswordWithOtp};
