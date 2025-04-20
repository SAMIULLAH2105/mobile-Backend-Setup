import express from "express";
import cors from "cors";
import passengerRoutes from "./Routes/passengerRoute.js";
import stationRoutes from "./Routes/stationRoutes.js";
import trainRoutes from "./Routes/trainRoutes.js";
import bookingRoutes from "./Routes/bookingRoutes.js";


import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // Allow all origins
    credentials: true,
  })
  
);

app.use(cookieParser({
  sameSite: "none",
  secure: true,
}));

app.use("/api/passengers", passengerRoutes);
app.use("/api/station", stationRoutes);
app.use("/api/train", trainRoutes);
app.use("/api/booking",bookingRoutes)

app.use((err, req, res, next) => {


  const statuscode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.send({
    statuscode,
    success: false,
    message,
    data : {}
  });
});


app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

