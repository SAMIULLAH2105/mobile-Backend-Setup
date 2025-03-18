import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const addTrain = asyncHandler(async (req, res) => {

  const {name,type,sourceStation,destinationStation}=req.body;

  if (!name || !type || !sourceStation || !destinationStation) {
    throw new ApiError(400, "Please fill all required fields");
  }

});

export { addTrain };
