const express = require("express");
const axios = require('axios');
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

//로그인 화면 페이지 프론트
app.get('/', (req, res) => {
  res.send(`
      <h1>Log in</h1>
      <a href="/login">Log in</a>
      <a href="/signup">Sign up</a>
  `);
});

app.get('/login', (req, res) => {
  let url = 'https://accounts.google.com/o/oauth2/v2/auth';
  url += `?client_id=${process.env.GOOGLE_CLIENT_ID}`
  url += `&redirect_uri=${process.env.GOOGLE_LOGIN_REDIRECT_URI}`
  url += '&response_type=code'
  url += '&scope=email profile'    
  res.redirect(url);
});

app.get('/login/redirect', (req, res) => {
  const { code } = req.query;
  console.log(`code: ${code}`);
  res.send('ok');
});

// 회원가입 라우터
app.get('/signup', (req, res) => {
  let url = 'https://accounts.google.com/o/oauth2/v2/auth';
  url += `?client_id=${process.env.GOOGLE_CLIENT_ID}`
  url += `&redirect_uri=${process.env.GOOGLE_SIGNUP_REDIRECT_URI}`
  url += '&response_type=code'
  url += '&scope=email profile'    
  res.redirect(url);
});

app.get('/signup/redirect', async (req, res) => {
  const { code } = req.query;
  console.log(`code: ${code}`);

  // access_token, refresh_token 등의 구글 토큰 정보 가져오기
  const resp = await axios.post(process.env.GOOGLE_TOKEN_URL, {
      // x-www-form-urlencoded(body)
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_SIGNUP_REDIRECT_URI,
      grant_type: 'authorization_code',
  });

  // email, google id 등의 사용자 구글 계정 정보 가져오기
  const resp2 = await axios.get(process.env.GOOGLE_USERINFO_URL, {
      // Request Header에 Authorization 추가
      headers: {
          Authorization: `Bearer ${resp.data.access_token}`,
      },
  });

  // 구글 인증 서버에서 json 형태로 반환 받은 body 클라이언트에 반환
  res.json(resp2.data);
});

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
