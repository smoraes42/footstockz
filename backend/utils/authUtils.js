import jwt from 'jsonwebtoken';

export const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  })
  res.cookie(process.env.TOKEN_NAME || "jwt_token", token, {
    httpOnly: true,
    secure: process.env.MODE === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};
