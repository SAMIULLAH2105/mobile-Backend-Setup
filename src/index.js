import express from "express";
import cors from "cors";
import passengerRoutes from "./Routes/passengerRoute.js";
import stationRoutes from "./Routes/stationRoutes.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // Change based on frontend
    credentials: true, // Allow credentials (cookies)
  })
);

app.use(cookieParser({
  sameSite: "none",
  secure: true,
}));
app.use("/api/passengers", passengerRoutes);
app.use("/api/station", stationRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
