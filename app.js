const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

const noticeRoutes = require('./routes/noticeRoute');
const financeRoutes = require('./routes/financeRoute');
const calendarRoutes = require('./routes/calendarRoute');
const galleryRoutes = require('./routes/galleryRoute');

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const s3 = new S3Client({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.KeyId,
    secretAccessKey: process.env.Secretkey,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "infosysweb",
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

const uploadImg = (req, res) => {
  return new Promise((resolve, reject) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        reject(err);  // 에러 발생 시 reject
      } else {
        const imageUrls = req.files.map(file => file.location);  // 업로드된 파일의 URL 가져오기
        resolve(imageUrls);  // 성공 시 resolve
      }
    });
  });
};


app.post("/add", upload.single("img1"), async (req, res) => {
  return(req.file.location);
  res.send("File uploaded successfully");
});

// Routes
app.use('/api/notice', noticeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/gallery', galleryRoutes);

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});

module.exports = {
  uploadImg
}