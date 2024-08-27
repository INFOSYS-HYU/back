const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const noticeRoute = require("./routes/noticeRoute");
const financeRoute = require("./routes/financeRoute");
const calendarRoute = require("./routes/calendarRoute");
const galleryRoute = require("./routes/galleryRoute");
const authStudent = require("./auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Routes
app.use("/api/notice", noticeRoute);
app.use("/api/finance", financeRoute);
app.use("/api/calendar", calendarRoute);
app.use("/api/gallery", galleryRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});