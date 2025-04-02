import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addStation = asyncHandler(async (req, res) => {
  const { name, status, city, situatedAt, province } = req.body;

  if (!name || !status || !city || !province) {
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

  const existingStation = await pool.query(
    `SELECT * FROM stations WHERE station_id = $1`,
    [id]
  );

  if (existingStation.rowCount === 0) {
    throw new ApiError(404, "Station not found");
  }

  // Create an array of fields that need to be updated
  const fields = [];
  const values = [];
  let index = 1;

  if (name) {
    fields.push(`station_name = $${index}`);
    values.push(name);
    index++;
  }
  if (status) {
    fields.push(`station_status = $${index}`);
    values.push(status);
    index++;
  }
  if (city) {
    fields.push(`city = $${index}`);
    values.push(city);
    index++;
  }
  if (situatedAt) {
    fields.push(`situated_At = $${index}`);
    values.push(situatedAt);
    index++;
  }
  if (province) {
    fields.push(`province = $${index}`);
    values.push(province);
    index++;
  }

  if (fields.length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }
  // Add station_id to the values array for the WHERE clause
  values.push(id);

  const query = `
    UPDATE stations
    SET ${fields.join(", ")}
    WHERE station_id = $${index}
  `;

  // Execute the query
  await pool.query(query, values);

  res.status(200).json({ message: "Station updated successfully" });
});


const deleteStation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingStation = await pool.query(
    `SELECT * FROM stations WHERE station_id = $1`,
    [id]
  );

  if (existingStation.rowCount === 0) {
    throw new ApiError(404, "Station not found");
  }

  await pool.query(`DELETE FROM stations WHERE station_id  = $1`, [id]);

  res.status(200).json({ message: "Station deleted successfully" });
});

export { addStation, updateStation, deleteStation };
