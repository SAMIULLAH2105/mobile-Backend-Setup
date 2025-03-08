import express from "express";
import cors from "cors";
import passengerRoutes from "./Routes/passengerRoute.js";

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/passengers", passengerRoutes);

export default app;
