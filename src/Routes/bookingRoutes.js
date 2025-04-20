import express from "express";

import {
  findAvailableSeats,
  bookTrainSeat,
} from "../Controllers/bookingController.js";
import { verifyJWT } from "../Middlewares/auth.middleware.js";

const bookingRoutes = express.Router();

bookingRoutes.get("/getAvailableSeats/:id", verifyJWT, findAvailableSeats);
bookingRoutes.post("/seat", verifyJWT, bookTrainSeat);

export default bookingRoutes;
