const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const {
  getNotice,
  getNoticeById,
  getFinance,
  getFinanceById, // 추가된 함수
  getCalendar,
  createNotice,
  updateNotice,
  deleteNotice,
  createGallery,
  updateGallery,
  deleteGallery,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  saveNoticeImages,
  saveGalleryImages,
  createFinance,
  saveFinanceImages,
} = require("./userDBC");
const noticeRoute = require("./routes/noticeRoutes");
const financeRoute = require("./routes/financeRoutes");
const clanedarRoute = require("./routes/clanedarRoutes");
const galleryRoute = require("./routes/galleryRoutes");
const authStudent = require("./auth");
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.route("/api/notice", noticeRoute);
app.route("/api/finance", financeRoute);
app.route("/api/clanedar", clanedarRoute);
app.route("/api/gallery", galleryRoute);

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
