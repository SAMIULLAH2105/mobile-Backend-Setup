import express from "express";
import { registerPassenger, changePassword } from "../Controllers/passengerController.js"; // Use `import` instead of `require`

const router = express.Router();

router.post("/register", registerPassenger);
router.post("/change", changePassword);

export default router; // Use `export default` instead of `module.exports`
