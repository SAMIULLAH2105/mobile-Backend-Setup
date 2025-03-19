import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addStation = asyncHandler(async (req, res) => {
  const { name, status, city, situatedAt, province } = req.body;

  if (!name || !status || !city || !situatedAt || !province) {
    throw new ApiError(400, "Please fill all required fields");
  }

  await pool.query(
    `INSERT INTO stations (station_name, station_status, city, situated_At, province) VALUES ($1, $2, $3, $4, $5)`,
    [name, status, city, situatedAt, province]
  );

  res
    .status(200)
    .json({ message: "Station added successfully", station: req.body });
});

const updateStation = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get station ID from URL
  const { name, status, city, situatedAt, province } = req.body;

  // Check if all fields exist
  if (!name || !status || !city || !situatedAt || !province) {
    throw new ApiError(400, "Please fill all required fields");
  }

  // Check if station exists
  const existingStation = await pool.query(
    `SELECT * FROM stations WHERE station_id  = $1`,
    [id]
  );

  if (existingStation.rowCount === 0) {
    throw new ApiError(404, "Station not found");
  }

  // Update station details
  await pool.query(
    `UPDATE stations 
     SET station_name = $1, station_status = $2, city = $3, situated_At = $4, province = $5 
     WHERE station_id  = $6`,
    [name, status, city, situatedAt, province, id]
  );

  res.status(200).json({ message: "Station updated successfully" });
});


const deleteStation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if station exists
  const existingStation = await pool.query(
    `SELECT * FROM stations WHERE station_id = $1`,
    [id]
  );

  if (existingStation.rowCount === 0) {
    throw new ApiError(404, "Station not found");
  }

  // Delete station
  await pool.query(`DELETE FROM stations WHERE station_id  = $1`, [id]);

  res.status(200).json({ message: "Station deleted successfully" });
});

export { addStation, updateStation, deleteStation };
