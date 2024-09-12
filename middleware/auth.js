const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // JWT 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Google ID 토큰 검증을 필요로 하는 경우, 별도의 로직에서 처리할 수 있습니다.
    // 예를 들어, Google ID 토큰 검증을 사용하는 다른 미들웨어에서 처리할 수 있습니다.
    // if (decoded.googleId) {
    //   try {
    //     const ticket = await client.verifyIdToken({
    //       idToken: token,
    //       audience: process.env.GOOGLE_CLIENT_ID,
    //     });
    //     const payload = ticket.getPayload();
    //     
    //     // Google ID와 JWT의 userId가 일치하는지 확인
    //     if (payload['sub'] !== decoded.id) {
    //       throw new Error('Google ID mismatch');
    //     }
    //     
    //     // Google 사용자 정보를 req 객체에 추가
    //     req.googleUser = payload;
    //   } catch (googleError) {
    //     console.error('Google token verification failed:', googleError);
    //     return res.status(401).json({ error: 'Invalid Google token' });
    //   }
    // }

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
