import express from "express";
import { addStation,updateStation, deleteStation} from "../Controllers/stationController.js"; // Use `import` instead of `require`
import {
  verifyJWT,
  adminAuthMiddleware,
} from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.post("/add", verifyJWT, adminAuthMiddleware, addStation);
router.put("/:id", verifyJWT, adminAuthMiddleware,updateStation); // Update station by ID
router.delete("/:id",verifyJWT, adminAuthMiddleware, deleteStation); // Delete station by ID

export default router;
