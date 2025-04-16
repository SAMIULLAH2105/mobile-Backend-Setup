import pool from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const findAvailableSeats = asyncHandler(async (req, res) => {
    const { id: train_id } = req.params;
    if (!train_id) {
        throw new ApiError(400, "Plz provide train ID to proceed")
    }

    console.log("Train ID", train_id);

    const checkIfTrainExists = await pool.query(`SELECT train_id from trains WHERE train_id=$1`, [train_id]);
    if (checkIfTrainExists.rowCount == 0) {
        throw new ApiError(404, "Train not found")
    }
    const availableSeatQuery = `SELECT coaches.train_id,coach_type.type_name AS coach_type,coaches.coach_number,trains.train_name, COUNT(seats.seat_number) AS available_seats
      FROM seats
      INNER JOIN coaches ON seats.coach_id = coaches.coach_id
      INNER JOIN coach_type ON coaches.coach_type_id = coach_type.coach_type_id
      INNER JOIN trains ON coaches.train_id=trains.train_id
      WHERE seats.is_available = TRUE AND trains.train_id=$1
      GROUP BY coach_type.coach_type_id, coach_type.type_name,coaches.coach_number,trains.train_name,coaches.train_id`

    const values = [train_id]

    const result = await pool.query(availableSeatQuery, values)

    return res.status(200).json(new ApiResponse(200, result.rows, "Available seats fetched successfully"))

})

export {
    findAvailableSeats
}