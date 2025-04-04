import express from "express";
import {
  verifyJWT,
  adminAuthMiddleware,
} from "../Middlewares/auth.middleware.js";
import {addTrain,deleteTrain,updateTrain,getAllTrains,insertTrainStops, getTrainSchedule,getTrainBySourceDestinationAndDate} from "../Controllers/trainController.js"

const router = express.Router();

router.post("/add", verifyJWT, adminAuthMiddleware, addTrain);
router.put("/:id", verifyJWT, adminAuthMiddleware,updateTrain); // Update station by ID
router.delete("/:id",verifyJWT, adminAuthMiddleware, deleteTrain); // Delete station by ID
router.get("/allTrains", getAllTrains);
router.post("/:id/stops", verifyJWT, adminAuthMiddleware, insertTrainStops); // Insert train stops by train ID
router.get("/:id",verifyJWT,getTrainSchedule);
router.get("/getTrainByDate/:sourceId/:destinationId/:date", getTrainBySourceDestinationAndDate);


export default router;