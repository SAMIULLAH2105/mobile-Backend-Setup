import express from "express";
import {
  verifyJWT,
  adminAuthMiddleware,
} from "../Middlewares/auth.middleware.js";
import {addTrain,deleteTrain,updateTrain,getAllTrains} from "../Controllers/trainController.js"

const router = express.Router();

router.post("/add", verifyJWT, adminAuthMiddleware, addTrain);
router.put("/:id", verifyJWT, adminAuthMiddleware,updateTrain); // Update station by ID
router.delete("/:id",verifyJWT, adminAuthMiddleware, deleteTrain); // Delete station by ID
router.get("/trains", getAllTrains);

export default router;