import fs from "fs";
import multer from "multer";
import path from "path";

// Ensure 'public/temp' directory exists
const tempDir = "./public/temp";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // Save files in 'public/temp'
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep original file name
  }
});

export const upload = multer({ storage });
