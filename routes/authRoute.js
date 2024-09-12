const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken"); 

const {
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  findOrCreateUser,
} = require("../userDBC");
const { OAuth2Client } = require("google-auth-library");

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

// router.post("/google/callback", async (req, res) => {
//   try {
//     const { code } = req.body;
//     const { tokens } = await oAuth2Client.getToken(code);

//     oAuth2Client.setCredentials(tokens);
//     console.log("code ", tokens);
//     const { access_token, refresh_token, id_token } = tokens;

//     const ticket = await oAuth2Client.verifyIdToken({
//       idToken: id_token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     const userId = payload["sub"];

//     console.log(userId);
//     const { user } = await findOrCreateUser(
//       userId,
//       payload.email,
//       payload.name
//     );

//     //나중에 여기서 그 회원가입 로직 처리하자
//     //if (user){
//     //
//     //} else {
//     //
//     //}
//     await storeRefreshToken(userId,refresh_token)
//     res.json({
//       access_token,
//       refresh_token,
//       user_id: userId,
//       email: payload.email,
//       name: payload.name,
//     });
//   } catch (error) {
//     console.error("구글 로그인 실패", error);
//     res.status(500).send("Authentication failed");
//   }
// });

router.post("/google/callback", async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oAuth2Client.getToken(code);

    oAuth2Client.setCredentials(tokens);
    console.log("Google Tokens:", tokens);
    const { access_token, refresh_token, id_token } = tokens;

    // Google ID Token 검증 및 사용자 정보 추출
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload["sub"];

    // 사용자가 있는지 확인하고 없으면 생성
    const { user } = await findOrCreateUser(userId, payload.email, payload.name);

    // JWT 토큰 발급 (accessToken, refreshToken)
    const jwtAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const jwtRefreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // Refresh Token을 서버에 저장
    await storeRefreshToken(userId, jwtRefreshToken);
    
    res.json({
      access_token: jwtAccessToken,  // 애플리케이션용 JWT Access Token
      refresh_token: jwtRefreshToken, // 애플리케이션용 JWT Refresh Token
      google_access_token: access_token, // 구글 API 접근용 Access Token
      google_refresh_token: refresh_token, // 구글 API 갱신용 Refresh Token
      user_id: userId,
      email: payload.email,
      name: payload.name,
    });
  } catch (error) {
    console.error("구글 로그인 실패", error);
    res.status(500).send("Authentication failed");
  }
});

// //엑세스 토큰 발급 
// router.post("/refresh-token", async (req, res) => {
//   const { refreshToken } = req.cookies;

//   if (!refreshToken) {
//     return res.status(400).json({ error: "Refresh token is required" });
//   }

//   try {
//     const ticket = await oAuth2Client.verifyIdToken({
//       idToken: refreshToken,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     const userId = payload["sub"];

//     // TODO: 저장된 리프레시 토큰과 비교
//     const storedRefreshToken = await getRefreshToken(userId);
//     if (refreshToken !== storedRefreshToken) {
//       return res.status(401).json({ error: "Invalid refresh token" });
//     }

//     const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
//       expiresIn: "1h",
//     });

//     res.json({ accessToken: newAccessToken });
//   } catch (error) {
//     console.error("Refresh token 검증 실패", error);
//     res.status(401).json({ error: "Invalid refresh token" });
//   }
// });

//엑세스 토큰 발급
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.headers['authorization']?.replace('Bearer ', '');

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    // JWT Refresh Token 검증
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = payload.id;

    // 저장된 리프레시 토큰과 비교
    const storedRefreshToken = await getRefreshToken(userId);
    if (refreshToken !== storedRefreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // 새로운 액세스 토큰 발급
    const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    
    // res.setHeader("Authorization", `Bearer ${newAccessToken}`);
    console.log(newAccessToken);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh token 검증 실패", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

//리프레시토큰 삭제
router.post("/delete-refresh-token", async (req, res) => {
  // const { refreshToken } = req.cookies;
  const refreshToken = req.headers['authorization']?.replace('Bearer ', '');

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required to log out" });
  }

  try {
    // JWT Refresh Token 검증
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = payload.id;

    // DB에서 리프레시 토큰 삭제
    await deleteRefreshToken(userId);

    // // 클라이언트의 쿠키에서도 리프레시 토큰 삭제
    // res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: 'Strict' });
    
    res.json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Refresh token 삭제 실패", error);
    res.status(500).json({ error: "Failed to log out" });
  }
});

// //리프레시토큰발급
// router.post("/get-refresh-token", async (req, res) => {
//   const { userId } = req.body;

//   if (!userId) {
//     return res.status(400).json({ error: "User ID is required" });
//   }

//   try {
//     // DB에서 리프레시 토큰 조회
//     const storedRefreshToken = await getRefreshToken(userId);

//     if (!storedRefreshToken) {
//       return res.status(404).json({ error: "No refresh token found for the user" });
//     }
//     res.cookie("refreshToken", jwtRefreshToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
//     // res.json({ refreshToken: storedRefreshToken });
//   } catch (error) {
//     console.error("Error retrieving refresh token:", error);
//     res.status(500).json({ error: "Failed to retrieve refresh token" });
//   }
// });


module.exports = router;
