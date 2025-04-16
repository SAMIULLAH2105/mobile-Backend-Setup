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

  const trainInfoQuery = `SELECT train_id, train_name FROM trains WHERE train_id = $1`;
  const trainInfoResult = await pool.query(trainInfoQuery, [id]);

  // Check if train exists
  const checkTrain = await pool.query(
    "SELECT * FROM trains WHERE train_id = $1",
    [id]
  );

  if (checkTrain.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  const scheduleQuery = `
        SELECT 
        s.station_name,
        NULL AS arrival_time,
        ts.departure_time,
        0 AS stop_number
      FROM train_schedule ts
      JOIN trains t ON ts.train_id = t.train_id
      JOIN stations s ON s.station_id = t.source_station_id
      WHERE t.train_id = $1

      UNION

      SELECT 
        s.station_name,
        ts1.arrival_time,
        ts1.departure_time,
        ts1.stop_number
      FROM train_stops ts1
      JOIN stations s ON s.station_id = ts1.station_id
      WHERE ts1.train_id = $1

      UNION

      SELECT 
        s.station_name,
        ts.arrival_time,
        NULL AS departure_time,
        999 AS stop_number
      FROM train_schedule ts
      JOIN trains t ON ts.train_id = t.train_id
      JOIN stations s ON s.station_id = t.destination_station_id
      WHERE t.train_id = $1

      ORDER BY stop_number;
          
  `;

  const schedule = await pool.query(scheduleQuery, [id]);

  if (schedule.rowCount === 0) {
    throw new ApiError(404, "No schedule found for this train");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      train_id: trainInfoResult.rows[0].train_id,
      train_name: trainInfoResult.rows[0].train_name,
      stops: schedule.rows
    }, "Train schedule fetched successfully")
  );
});



const makeTrainSchedule = asyncHandler(async (req, res) => {
  const { train_id, travel_date, departure_time, arrival_time, status,travel_duration } = req.body;
  if (!train_id || !travel_date || !departure_time || !arrival_time || !status) {
    throw new ApiError(400, "Please fill all required fields");
  }
  const travelDateObj = new Date(travel_date);  // this ocnverts travel_date into a JS date object
  const today = new Date();  //It ensures you're comparing just the dates, not the time of day.
  today.setHours(0, 0, 0, 0);

  if (travelDateObj <= today) {
    throw new ApiError(400, "Travel date must be in the future");
  }
  const trainExists = await pool.query('SELECT train_id FROM trains WHERE train_id = $1', [train_id]);

  const checkIfScheduleExists=await pool.query(`SELECT FROM train_schedule WHERE train_id=$1`);
  if(checkIfScheduleExists.rowCount>0){
    throw new ApiError(400,"Schedule for this train already exist")
  }

  if (trainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }
  const insertQuery = `INSERT INTO train_schedule (train_id, travel_date, departure_time, arrival_time,status,travel_duration)
   VALUES ($1, $2, $3, $4,$5,$6) RETURNING *`;
  const values = [train_id, travel_date, departure_time, arrival_time, status,travel_duration];

  const result = await pool.query(insertQuery, values);

  return res.status(201).json(new ApiResponse(201, result.rows[0], "Train schedule created successfully"));

})

const updateTrainSchedule = asyncHandler(async (req, res) => {
  const { id: schedule_id } = req.params;
  const { travel_date, departure_time, arrival_time, status,travel_duration } = req.body;

  if (!travel_date && !departure_time && !arrival_time && !status && !travel_duration) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (travel_date) {
    const travelDateObj = new Date(travel_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDateObj <= today) {
      throw new ApiError(400, "Travel date must be in the future");
    }
    fields.push(`travel_date = $${idx++}`);
    values.push(travel_date);
  }

  if (departure_time) {
    fields.push(`departure_time = $${idx++}`);
    values.push(departure_time);
  }

  if (arrival_time) {
    fields.push(`arrival_time = $${idx++}`);
    values.push(arrival_time);
  }

  if (status) {
    fields.push(`status = $${idx++}`);
    values.push(status);
  }
  if(travel_duration){
    fields.push(`travel_duration= $${idx++}`);
    values.push(travel_duration)
  }

  values.push(schedule_id); // Final placeholder for WHERE clause

  const updateQuery = `
    UPDATE train_schedule 
    SET ${fields.join(', ')} 
    WHERE schedule_id = $${idx} 
    RETURNING *`;

  const result = await pool.query(updateQuery, values);

  if (result.rowCount === 0) {
    throw new ApiError(404, "Train schedule not found");
  }

  return res.status(200).json(new ApiResponse(200, result.rows[0], "Train schedule updated successfully"));
  
});

// This will give trains will Source, Destination, and Date filters
const getTrainBySourceDestinationAndDate = asyncHandler(async (req, res) => {
  const { source_station, destination_station, date } = req.body;

  if (!source_station || !destination_station || !date) {
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
    "SELECT * FROM stations WHERE station_name = $1",
    [source_station]
  );
  const destinationExists = await pool.query(
    "SELECT * FROM stations WHERE station_name = $1",
    [destination_station]
  );
  if (sourceExists.rowCount === 0 || destinationExists.rowCount === 0) {
    throw new ApiError(404, "Source or destination station not found");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset time for the parsedDate
  parsedDate.setHours(0, 0, 0, 0);

  if (parsedDate < today) {
    throw new ApiError(400, "Search date cannot be before today");
  }

  // Query to fetch trains
  const query = `SELECT
  t.train_id,
  t.train_name,
  t.train_type,
  s_source.station_name AS source_station,
  s_dest.station_name AS destination_station,
  ts.travel_date,
  src_stop.departure_time AS departure_time,
  dest_stop.arrival_time AS arrival_time
  FROM trains t
  INNER JOIN train_schedule ts ON t.train_id = ts.train_id
  INNER JOIN train_stops src_stop ON t.train_id = src_stop.train_id
  INNER JOIN train_stops dest_stop ON t.train_id = dest_stop.train_id
  INNER JOIN stations s_source ON src_stop.station_id = s_source.station_id
  INNER JOIN stations s_dest ON dest_stop.station_id = s_dest.station_id
  WHERE s_source.station_name = $1
    AND s_dest.station_name = $2
    AND src_stop.stop_number < dest_stop.stop_number
    AND ts.travel_date = $3
`;

const { rows } = await pool.query(query, [
  source_station,
  destination_station,
  parsedDate,
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
  makeTrainSchedule,
  updateTrainSchedule,
  getTrainSchedule,
  getTrainBySourceDestinationAndDate,
};
