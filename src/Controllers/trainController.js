import pool from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Add a Train
const addTrain = asyncHandler(async (req, res) => {
  const {
    train_name,
    train_type,
    total_coaches,
    status,
    source_station_id,
    destination_station_id,
  } = req.body;

  if (
    !train_name ||
    !train_type ||
    !total_coaches ||
    !status ||
    !source_station_id ||
    !destination_station_id
  ) {
    throw new ApiError(400, "Please fill all required fields");
  }
  if (source_station_id == destination_station_id) {
    throw new ApiError(400, "Souce and Destination cannot be same.");
  }

  // Check if source and destination stations exist
  const sourceExists = await pool.query(
    "SELECT * FROM stations WHERE station_id = $1",
    [source_station_id]
  );
  const destinationExists = await pool.query(
    "SELECT * FROM stations WHERE station_id = $1",
    [destination_station_id]
  );

  if (sourceExists.rowCount === 0 || destinationExists.rowCount === 0) {
    throw new ApiError(404, "Source or destination station not found");
  }

  // Insert train into database
  const newTrain = await pool.query(
    `INSERT INTO trains (train_name, train_type, total_coaches, status, source_station_id, destination_station_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      train_name,
      train_type,
      total_coaches,
      status,
      source_station_id,
      destination_station_id,
    ]
  );

  res
    .status(201)
    .json(new ApiResponse(201, newTrain.rows[0], "Train added successfully"));
});

// Update a Train
const updateTrain = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    train_name,
    train_type,
    total_coaches,
    status,
    source_station_id,
    destination_station_id,
  } = req.body;

  const trainExists = await pool.query(
    "SELECT * FROM trains WHERE train_id = $1",
    [id]
  );
  if (trainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  const fields = [];
  const values = [];
  let index = 1;

  if (train_name) {
    fields.push(`train_name = $${index}`);
    values.push(train_name);
    index++;
  }
  if (train_type) {
    fields.push(`train_type = $${index}`);
    values.push(train_type);
    index++;
  }
  if (total_coaches) {
    fields.push(`total_coaches = $${index}`);
    values.push(total_coaches);
    index++;
  }
  if (status) {
    fields.push(`status = $${index}`);
    values.push(status);
    index++;
  }
  if (source_station_id) {
    fields.push(`source_station_id = $${index}`);
    values.push(source_station_id);
    index++;
  }
  if (destination_station_id) {
    fields.push(`destination_station_id = $${index}`);
    values.push(destination_station_id);
    index++;
  }

  if (fields.length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }

  values.push(id);
  const query = `UPDATE trains SET ${fields.join(
    ", "
  )} WHERE train_id = $${index}`;

  await pool.query(query, values);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Train updated successfully"));
});

// Delete a Train
const deleteTrain = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if train exists
  const trainExists = await pool.query(
    "SELECT * FROM trains WHERE train_id = $1",
    [id]
  );
  if (trainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  // Delete train
  await pool.query("DELETE FROM trains WHERE train_id = $1", [id]);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Train deleted successfully"));
});

const getAllTrains = asyncHandler(async (req, res) => {
  const allTrainsQuery = await pool.query(`SELECT 
    t.*, 
    s1.station_name AS source_station_name, 
    s2.station_name AS destination_station_name
FROM trains t
LEFT JOIN stations s1 ON t.source_station_id = s1.station_id
LEFT JOIN stations s2 ON t.destination_station_id = s2.station_id`);

  const filteredTrains = allTrainsQuery.rows.map(
    ({ source_station_id, destination_station_id, ...rest }) => rest
  );
  res
    .status(200)
    .json(new ApiResponse(200, filteredTrains, "All Trains Fetched"));

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
});

// This is to insert train stops

const insertTrainStops = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "Train ID is required");
  }
  const trainExists = await pool.query(
    "SELECT * FROM trains WHERE train_id = $1",
    [id]
  );
  if (trainExists.rowCount == 0) {
    throw new ApiError(404, "Train not found");
  }

  const stops = req.body;
  if (!Array.isArray(stops) || stops.length === 0) {
    throw new ApiError(400, "Please provide an array of stops");
  }

  // Validate each stop
  for (const stop of stops) {
    const { station_id, arrival_time, departure_time, stop_number } = stop;
    if (!station_id || !arrival_time || !departure_time || !stop_number) {
      throw new ApiError(
        400,
        "Each stop must have station id, arrival time, departure time, and stop number"
      );
    }

    const stationExists = await pool.query(
      "SELECT * FROM stations WHERE station_id = $1",
      [station_id]
    );
    if (stationExists.rowCount == 0) {
      throw new ApiError(404, `Station with ID ${station_id} not found`);
    }
  }

  const insertStops = stops.map((stop) => {
    const query = `
      INSERT INTO train_stops (train_id, station_id, arrival_time, departure_time, stop_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`;

    const queryParams = [
      id,
      stop.station_id,
      stop.arrival_time,
      stop.departure_time,
      stop.stop_number,
    ];
    return pool.query(query, queryParams);
  });

  // Wait for all insert operations to complete
  const results = await Promise.all(insertStops);

  // Gather all the inserted stop records
  const insertedStops = results.map((result) => result.rows[0]);
  res
    .status(201)
    .json(
      new ApiResponse(201, insertedStops, "Train stops added successfully")
    );
});

// This retrieves a train schedule
const getTrainSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const checkTrain = await pool.query(
    "SELECT * FROM trains WHERE train_id=$1",
    [id]
  );
  if ((checkTrain.rowCount = 0)) {
    throw new ApiError(404, "Train not found");
  }
  const scheduleQuery = `SELECT ts.*, s.station_id, s.station_name, t.train_id, t.train_name
  FROM train_stops ts
  JOIN trains t ON t.train_id = ts.train_id
  JOIN stations s ON ts.station_id = s.station_id
  WHERE t.train_id = $1
  ORDER BY ts.stop_number`;

  const schedule = await pool.query(scheduleQuery, [id]);

  if ((schedule.rowCount = 0)) {
    throw new ApiError(404, "No schedule found for this train");
  }

  /*The line essentially removes train_id and train_name from each object in the schedule.rows array, and retains only 
  the other properties (station_id, arrival_time, departure_time, and stop_number). */
  // This is done to avoid redundancy in the response, as train_id and train_name are already known from the context of the request.

  const filteredSchedule = schedule.rows.map(
    ({ train_id, train_name, ...rest }) => rest
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        filteredSchedule,
        "Train schedule fetched successfully"
      )
    );
});

// This will give trains will Source, Destination, and Date filters
const getTrainBySourceDestinationAndDate = asyncHandler(async (req, res) => {
  const { sourceId, destinationId, date } = req.params;

  if (!sourceId || !destinationId || !date) {
    throw new ApiError(400, "Please provide sourceId, destinationId, and date");
  }

  // Parse the date string into a Date object
  const parsedDate = new Date(date);

  // Check if the parsedDate is a valid Date object
  if (isNaN(parsedDate)) {
    throw new ApiError(400, "Invalid date format");
  }

  // Check if source and destination stations exist
  const sourceExists = await pool.query(
    "SELECT * FROM stations WHERE station_id = $1",
    [sourceId]
  );
  const destinationExists = await pool.query(
    "SELECT * FROM stations WHERE station_id = $1",
    [destinationId]
  );
  if (sourceExists.rowCount === 0 || destinationExists.rowCount === 0) {
    throw new ApiError(404, "Source or destination station not found");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset time for the parsedDate
  parsedDate.setHours(0, 0, 0, 0);

  // Compare the dates
  if (parsedDate < today) {
    throw new ApiError(400, "Search date cannot be before today");
  }

  // Query to fetch trains
  const query = `
  SELECT 
    t.train_id, 
    t.train_name, 
    t.train_type, 
    t.total_coaches, 
    t.status, 
    ts.departure_time, 
    ts.arrival_time
  FROM 
    trains t
  JOIN 
    train_schedule ts ON t.train_id = ts.train_id
  WHERE 
    t.source_station_id = $1 AND t.destination_station_id = $2 AND ts.travel_date = $3
`;

  const { rows } = await pool.query(query, [
    sourceId,
    destinationId,
    parsedDate, // Use parsedDate instead of the raw string date
  ]);

  if (rows.length === 0) {
    return res.status(303).json(
      new ApiResponse(
        303,
        null,
        "No trains found for the given source, destination, and date"
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      rows, // Send the fetched train data in the response
      "Trains fetched successfully for the given source, destination, and date"
    )
  );
});



export {
  addTrain,
  updateTrain,
  deleteTrain,
  getAllTrains,
  insertTrainStops,
  getTrainSchedule,
  getTrainBySourceDestinationAndDate,
};
