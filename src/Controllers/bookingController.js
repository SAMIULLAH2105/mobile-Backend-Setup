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

    result.rows.forEach(row => {
        const key = row.coach_number;

        if (!grouped[key]) {
            grouped[key] = {
                coach_number: row.coach_number,
                coach_type: row.coach_type,
                train_name: row.train_name,
                available_seats: 0,
                booked_seats: 0
            };
        }

        if (row.is_available) {
            grouped[key].available_seats += parseInt(row.seats);
        } else {
            grouped[key].booked_seats += parseInt(row.seats);
        }
    });

    const formattedResult = Object.values(grouped);

    const seatsFetched = formattedResult.length > 0
        ? "Coach-wise seat details fetched successfully"
        : "No seat details found: this train may be fully booked or lack seat data";

    return res.status(200).json(new ApiResponse(200, formattedResult, seatsFetched));
});

export {
    findAvailableSeats
}