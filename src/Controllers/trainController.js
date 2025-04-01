import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Add a Train
const addTrain = asyncHandler(async (req, res) => {
  const { train_name, train_type, total_coaches, status, source_station_id, destination_station_id } = req.body;

  if (!train_name || !train_type || !total_coaches || !status || !source_station_id || !destination_station_id) {
    throw new ApiError(400, "Please fill all required fields");
  }
  if (source_station_id == destination_station_id){
    throw new ApiError(400, "Souce and Destination cannot be same.");
  }

  // Check if source and destination stations exist
  const sourceExists = await pool.query("SELECT * FROM stations WHERE station_id = $1", [source_station_id]);
  const destinationExists = await pool.query("SELECT * FROM stations WHERE station_id = $1", [destination_station_id]);

  if (sourceExists.rowCount === 0 || destinationExists.rowCount === 0) {
    throw new ApiError(404, "Source or destination station not found");
  }

  // Insert train into database
  const newTrain = await pool.query(
    `INSERT INTO trains (train_name, train_type, total_coaches, status, source_station_id, destination_station_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [train_name, train_type, total_coaches, status, source_station_id, destination_station_id]
  );

  res.status(201).json(new ApiResponse(201, newTrain.rows[0], "Train added successfully"));
});

// Update a Train
const updateTrain = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { train_name, train_type, total_coaches, status, source_station_id, destination_station_id } = req.body;

  // Check if train exists
  const trainExists = await pool.query("SELECT * FROM trains WHERE train_id = $1", [id]);
  if (trainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  // Update train details
  await pool.query(
    `UPDATE trains SET train_name = $1, train_type = $2, total_coaches = $3, status = $4, 
     source_station_id = $5, destination_station_id = $6 WHERE train_id = $7`,
    [train_name, train_type, total_coaches, status, source_station_id, destination_station_id, id]
  );

  res.status(200).json(new ApiResponse(200, null, "Train updated successfully"));
});

// Delete a Train
const deleteTrain = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if train exists
  const trainExists = await pool.query("SELECT * FROM trains WHERE train_id = $1", [id]);
  if (trainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  // Delete train
  await pool.query("DELETE FROM trains WHERE train_id = $1", [id]);

  res.status(200).json(new ApiResponse(200, null, "Train deleted successfully"));
});

const getAllTrains=asyncHandler(async(req,res)=>{
 const allTrains= await pool.query(`SELECT 
    t.*, 
    s1.station_name AS source_station_name, 
    s2.station_name AS destination_station_name
FROM trains t
LEFT JOIN stations s1 ON t.source_station_id = s1.station_id
LEFT JOIN stations s2 ON t.destination_station_id = s2.station_id`)
 

const filteredTrains = allTrains.rows.map(({ source_station_id, destination_station_id, ...rest }) => rest);
 res.status(200).json(new ApiResponse(200,filteredTrains,"All Trains Fetched"))


 //traditional syntax
//  const filteredTrains = allTrains.rows.map(function (train) {
//   const { source_station_id, destination_station_id, ...rest } = train;
//   return rest;
// });

//arrow syntax
// const filteredTrains = allTrains.rows.map(train => {
//   const { source_station_id, destination_station_id, ...rest } = train;
//   return rest;
// });
})

export { addTrain, updateTrain, deleteTrain,getAllTrains };
