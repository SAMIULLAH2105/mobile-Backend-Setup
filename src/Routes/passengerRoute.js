import express from "express";
import { upload } from "../Middlewares/multer.middleware.js";
import {
  registerPassenger,
  changePassword,
  loginPassenger,
  getPassengerById,
  updatePassengerDeatails,
  logOutPasenger,
  deletePassengerAccount,
} from "../Controllers/passengerController.js"; // Use `import` instead of `require`
import { verifyJWT } from "../Middlewares/auth.middleware.js";

// import { registerPassenger, changePassword, loginPassenger } from "../Controllers/passengerController.js"; // Use `import` instead of `require`
// import { forgotPassword } from "../Controllers/passengerController.js";
const router = express.Router();

// router.post("/register",upload.single("profile_picture"), registerPassenger);
router.post(
  "/register",
  upload.fields([{ name: "profile_photo", maxCount: 1 }]),
  registerPassenger
);

router.post("/change", changePassword);
// router.post("/forgot", forgotPassword);
router.post("/login", loginPassenger);

router.get("/Profile", verifyJWT, getPassengerById);
router.post("/update", verifyJWT, updatePassengerDeatails);
router.post("/logout", verifyJWT, logOutPasenger);
router.delete("/delete", verifyJWT, deletePassengerAccount);

export default router; // Use `export default` instead of `module.exports`
