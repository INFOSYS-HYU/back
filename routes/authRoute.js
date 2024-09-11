const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { storeRefreshToken, getRefreshToken, deleteRefreshToken } = require('../userDBC');

// Google 로그인 라우트
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google 로그인 콜백 라우트
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    console.log(req.header);
    const accessToken = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET | "secret", { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: req.user.id }, process.env.JWT_REFRESH_SECRET | "secret", { expiresIn: '7d' });
    // Refresh 토큰 저장
    await storeRefreshToken(req.user.id, refreshToken);

    // Access 토큰은 클라이언트에 전송
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true }); // 쿠키에 저장
    res.redirect(`/auth-success?token=${accessToken}`);
  }
);


router.post('/logout', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      // Refresh Token 검증 및 사용자 ID 추출
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const userId = decoded.id;

      // Refresh Token 삭제 (서버 측에서)
      await deleteRefreshToken(userId);

      // 쿠키에서 Refresh Token 삭제
      res.clearCookie('refreshToken', { httpOnly: true, secure: true });

      // 홈으로 리디렉션
      res.redirect('/');
    } catch (error) {
      res.status(500).json({ error: 'Failed to log out' });
    }
  } else {
    res.status(400).json({ error: 'No refresh token found' });
  }
});


// 토큰 갱신 라우트
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const storedRefreshToken = await getRefreshToken(decoded.id);

    if (refreshToken !== storedRefreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});



module.exports = router;