import express from "express";
import cors from "cors";
import { config } from "./config";
import recruitersRouter from "./routes/recruiters";
import authRouter from "./routes/auth";
import meRouter from "./routes/me";
import campaignsRouter from "./routes/campaigns";
import candidatesRouter from "./routes/candidates";
import interviewsRouter from "./routes/interviews";
import { errorHandler } from "./middleware/error";
import { NotFoundError } from "./utils/errors";

const app = express();

app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/recruiters", recruitersRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/interviews", interviewsRouter);

// Any unmatched route becomes a shaped 404 via the error handler.
app.use((req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
});

// Registered last so it catches errors from every route above.
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Backend listening on http://localhost:${config.PORT}`);
});
