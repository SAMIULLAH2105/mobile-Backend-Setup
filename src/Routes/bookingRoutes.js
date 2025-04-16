import express from 'express'

import { findAvailableSeats } from '../Controllers/bookingController.js';
import { verifyJWT } from '../Middlewares/auth.middleware.js';

const bookingRoutes=express.Router();

bookingRoutes.get('/getAvailableSeats/:id',verifyJWT,findAvailableSeats)

export default bookingRoutes;