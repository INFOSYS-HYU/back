const express = require("express");
const router = express.Router();
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

router.post("/google/callback", async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oAuth2Client.getToken(code);

    oAuth2Client.setCredentials(tokens);
    console.log("code ", tokens);
    const { access_token, refresh_token, id_token } = tokens;

    const ticket = await oAuth2Client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload["sub"];

    console.log(userId);
    const { user } = await findOrCreateUser(
      userId,
      payload.email,
      payload.name
    );

    //나중에 여기서 그 회원가입 로직 처리하자
    //if (user){
    //
    //} else {
    //
    //}
    res.json({
      access_token,
      refresh_token,
      user_id: userId,
      email: payload.email,
      name: payload.name,
    });
  } catch (error) {
    console.error("구글 로그인 실패", error);
    res.status(500).send("Authentication failed");
  }
});

router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: refreshToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload["sub"];

    // TODO: 저장된 리프레시 토큰과 비교
    // const storedRefreshToken = await getRefreshToken(userId);
    // if (refreshToken !== storedRefreshToken) {
    //   return res.status(401).json({ error: "Invalid refresh token" });
    // }

    const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh token 검증 실패", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

module.exports = router;
