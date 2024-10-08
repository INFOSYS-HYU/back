const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

const passport = require("./config/passport");
const session = require("express-session");
const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/authRoute");
const noticeRoutes = require("./routes/noticeRoute");
const financeRoutes = require("./routes/financeRoute");
const calendarRoutes = require("./routes/calendarRoute");
const galleryRoutes = require("./routes/galleryRoute");

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const s3 = new S3Client({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.KeyId,
    secretAccessKey: process.env.Secretkey,
  },
});


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/notice", noticeRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/gallery", galleryRoutes);

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});