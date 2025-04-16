import express from "express";
import {
  verifyJWT,
  adminAuthMiddleware,
} from "../Middlewares/auth.middleware.js";

import {
  addTrain,
  deleteTrain,
  updateTrain,
  getAllTrains,
  insertTrainStops, 
  getTrainSchedule,
  makeTrainSchedule,
  updateTrainSchedule,
  getTrainBySourceDestinationAndDate,
} 
from "../Controllers/trainController.js"

const router = express.Router();

router.post("/add", verifyJWT, adminAuthMiddleware, addTrain);
router.put("/:id", verifyJWT, adminAuthMiddleware,updateTrain); // Update station by ID
router.delete("/:id",verifyJWT, adminAuthMiddleware, deleteTrain); // Delete station by ID
router.get("/allTrains", getAllTrains);
router.post("/:id/stops", verifyJWT, adminAuthMiddleware, insertTrainStops); // Insert train stops by train ID
router.get("/:id",verifyJWT,getTrainSchedule);
router.post("/makeSchedule", verifyJWT, adminAuthMiddleware, makeTrainSchedule); // Make train schedule by train ID
router.put("/updateSchedule/:id", verifyJWT, adminAuthMiddleware, updateTrainSchedule); // Update train schedule by ID
router.post("/getTrainByDate",verifyJWT, getTrainBySourceDestinationAndDate);

export default router;