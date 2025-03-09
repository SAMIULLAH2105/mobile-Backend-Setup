import express from "express";
import cors from "cors";
import passengerRoutes from "./Routes/passengerRoute.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // Change based on frontend
    credentials: true, // Allow credentials (cookies)
  })
);

app.use(cookieParser());
app.use("/api/passengers", passengerRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
