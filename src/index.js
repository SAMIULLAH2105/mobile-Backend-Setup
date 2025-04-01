import express from "express";
import cors from "cors";
import passengerRoutes from "./Routes/passengerRoute.js";
import stationRoutes from "./Routes/stationRoutes.js";
import trainRoutes from "./Routes/trainRoutes.js";
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
app.use("/api/train", trainRoutes);


app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
