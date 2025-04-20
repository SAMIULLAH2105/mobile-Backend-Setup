import pool from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const findAvailableSeats = asyncHandler(async (req, res) => {
  const { id: train_id } = req.params;
  if (!train_id) {
    throw new ApiError(400, "Please provide train ID to proceed");
  }

  console.log("Train ID", train_id);

  const checkIfTrainExists = await pool.query(
    `SELECT train_id FROM trains WHERE train_id = $1`,
    [train_id]
  );

  if (checkIfTrainExists.rowCount === 0) {
    throw new ApiError(404, "Train not found");
  }

  const availableSeatQuery = `
      SELECT 
        coaches.train_id,
        coach_type.type_name AS coach_type,
        coaches.coach_number,
        trains.train_name,
        COUNT(seats.seat_number) AS seats,
        seats.is_available
      FROM seats
      INNER JOIN coaches ON seats.coach_id = coaches.coach_id
      INNER JOIN coach_type ON coaches.coach_type_id = coach_type.coach_type_id
      INNER JOIN trains ON coaches.train_id = trains.train_id
      WHERE trains.train_id = $1
      GROUP BY 
        coach_type.coach_type_id, 
        coach_type.type_name, 
        coaches.coach_number, 
        trains.train_name, 
        coaches.train_id, 
        seats.is_available
    `;

  const values = [train_id];
  const result = await pool.query(availableSeatQuery, values);

  // Transform into grouped format
  const grouped = {};

  result.rows.forEach((row) => {
    const key = row.coach_number;

    if (!grouped[key]) {
      grouped[key] = {
        coach_number: row.coach_number,
        coach_type: row.coach_type,
        train_name: row.train_name,
        available_seats: 0,
        booked_seats: 0,
      };
    }

    if (row.is_available) {
      grouped[key].available_seats += parseInt(row.seats);
    } else {
      grouped[key].booked_seats += parseInt(row.seats);
    }
  });

  const formattedResult = Object.values(grouped);

  const seatsFetched =
    formattedResult.length > 0
      ? "Coach-wise seat details fetched successfully"
      : "No seat details found: this train may be fully booked or lack seat data";

  return res
    .status(200)
    .json(new ApiResponse(200, formattedResult, seatsFetched));
});

const bookTrainSeat = asyncHandler(async (req, res) => {
  // Extract the required data from the request body
  const {
    train_id,
    travel_date,
    from_station_id,
    to_station_id,
    coach_type_id,
    seat_id, // Accept seat_id from user
  } = req.body;

  // 1. Get the Train Name from the trains table
  const trainRes = await pool.query(
    `SELECT train_name FROM trains WHERE train_id = $1`,
    [train_id]
  );
  if (trainRes.rowCount === 0) {
    throw new ApiError(404, "Train not found"); // If no train found, throw error
  }
  const train_name = trainRes.rows[0].train_name;

  // 2. Get the Departure Time from the train_schedule table based on train_id and travel_date
  const scheduleRes = await pool.query(
    `SELECT departure_time FROM train_schedule WHERE train_id = $1 AND travel_date = $2`,
    [train_id, travel_date]
  );
  if (scheduleRes.rowCount === 0) {
    throw new ApiError(404, "Train schedule not found"); // If no schedule found, throw error
  }
  const departure_time = scheduleRes.rows[0].departure_time;

  // 3. Validate the Route: Check if the stations are part of the train's stops and if the route is valid
  const stopsRes = await pool.query(
    `SELECT station_id, stop_number FROM train_stops WHERE train_id = $1`,
    [train_id]
  );
  const stops = stopsRes.rows;
  const fromStop = stops.find((s) => s.station_id === from_station_id);
  const toStop = stops.find((s) => s.station_id === to_station_id);
  if (!fromStop || !toStop) {
    throw new ApiError(400, "One or both stations not found in the route"); // If stations are not part of the route, throw error
  }
  if (fromStop.stop_number >= toStop.stop_number) {
    throw new ApiError(400, "Invalid station order"); // If the station order is incorrect, throw error
  }

  // 4. Validate Coach Type: Ensure that the specified coach type exists for the given train
  const coachRes = await pool.query(
    `SELECT coach_id FROM coaches WHERE train_id = $1 AND coach_type_id = $2`,
    [train_id, coach_type_id]
  );
  const coachIds = coachRes.rows.map((c) => c.coach_id);
  if (coachIds.length === 0) {
    throw new ApiError(404, "No coaches available for this coach type"); // If no matching coaches found, throw error
  }

  // 5. Validate Selected Seat: Check if the selected seat is available and belongs to the given train and coach
  const seatRes = await pool.query(
    `SELECT seats.seat_id, seats.coach_id, seats.seat_number
     FROM seats
     INNER JOIN coaches ON seats.coach_id = coaches.coach_id
     WHERE seats.seat_id = $1 AND coaches.train_id = $2 AND seats.is_available = true`,
    [seat_id, train_id]
  );

  if (seatRes.rowCount === 0) {
    throw new ApiError(
      400,
      "Selected seat is not available or does not belong to the train"
    ); // If seat is not available, throw error
  }

  const selectedSeat = seatRes.rows[0]; // Get selected seat details
  console.log("Selected Seat:", selectedSeat); // Log selected seat details for debugging

  // 6. Get Passenger Info: Get the passenger ID from the logged-in user
  const passenger_id = req.user.passenger_id;
  const bookingDate = new Date(); // Get the current date for booking date

  // 7. Insert the booking into the bookings table
  const bookingRes = await pool.query(
    `INSERT INTO bookings (
      passenger_id, train_id, train_name, seat_id, coach_id,
      departure_time, travel_date, booking_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`, // Returning the inserted booking details
    [
      passenger_id,
      train_id,
      train_name,
      selectedSeat.seat_id,
      selectedSeat.coach_id,
      departure_time,
      travel_date,
      bookingDate,
    ]
  );

  // 8. Update the seat's availability to false since it's now booked
  await pool.query(`UPDATE seats SET is_available = false WHERE seat_id = $1`, [
    selectedSeat.seat_id,
  ]);

  const seatNumb_coachNum = await pool.query(
    `SELECT 
       s.seat_number,
       c.coach_number
     FROM seats s
     JOIN coaches c ON s.coach_id = c.coach_id
     WHERE s.seat_id = $1 AND c.coach_id = $2`,
    [selectedSeat.seat_id, selectedSeat.coach_id]
  );

  const {
    seat_id: _seatId, // renaming to avoid redeclaration
    coach_id: _coachId,
    ...bookingDataWithoutIds
  } = bookingRes.rows[0];

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        ...bookingDataWithoutIds,
        seat_number: seatNumb_coachNum.rows[0].seat_number,
        coach_number: seatNumb_coachNum.rows[0].coach_number,
      },
      "Booking successful"
    )
  );

  // Return the successful response with the booking details
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        ...bookingRes.rows[0],
        seat_number: seatNumb_coachNum.rows[0].seat_number,
        coach_number: seatNumb_coachNum.rows[0].coach_number,
      },
      "Booking successful"
    )
  );
});

export { findAvailableSeats, bookTrainSeat };
