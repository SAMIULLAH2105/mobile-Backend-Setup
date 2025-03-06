import express from "express";
import { upload } from "../Middlewares/multer.middleware.js";
import { registerPassenger, changePassword, loginPassenger } from "../Controllers/passengerController.js"; // Use `import` instead of `require`

const router = express.Router();

// router.post("/register",upload.single("profile_picture"), registerPassenger);
router.post("/register", upload.fields([{ name: "profile_photo", maxCount: 1 }]), registerPassenger);

router.post("/change", changePassword);
router.post("/forgot", forgotPassword);
router.post("/login", loginPassenger);

export default router; // Use `export default` instead of `module.exports`
