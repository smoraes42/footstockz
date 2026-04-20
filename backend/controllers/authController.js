import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import db1 from "../database/db1.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../mailservice/emailHandler.js";
import { generateVerificationCode, generateTokenAndSetCookie } from "../utils/authUtils.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allowedRegex = /^[a-zA-Z0-9]+$/;
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!regex.test(email) || !allowedRegex.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username or email format" });
    }
    if(username.length < 6) {
      return res.status(400).json({ success: false, message: "Username Too Short" });
    }
    const [emailExists] = await db1.query('SELECT * FROM users WHERE email = ?', [email]);
    const [userExists] = await db1.query('SELECT * FROM users WHERE username = ?', [username]);
    if (emailExists[0] || userExists[0]) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }
    const passwordHash = await bcrypt.hash(password, 12);

    const verificationCode = generateVerificationCode();

    const insertUser = `INSERT INTO users (username, email, password, is_verified, verification_token) VALUES (?,?,?,?,?)`;
    const [result] = await db1.query(insertUser, [username, email, passwordHash, false, verificationCode]);
    const userId = result.insertId;

    await db1.query('INSERT INTO wallets (user_id, value) VALUES (?, ?)', [userId, 20000]);
    await db1.query(
      'INSERT INTO portfolio_history (user_id, wallet_value, holdings_value, total_equity) VALUES (?, ?, ?, ?)',
      [userId, 20000, 0, 20000]
    );

    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: "User registered successfully. Please check your email for the verification code." });
  } catch (error) {
    console.log("Signup Error: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allowedRegex = /^[0-9]+$/;
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and verification code are required" });
    }
    if (!regex.test(email) || !allowedRegex.test(code)) {
      return res.status(400).json({ success: false, message: "Email and verification code Invalid Format" });
    }

    const [findUser] = await db1.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = findUser[0];

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    if (user.verification_token !== code) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    await db1.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?', [user.id]);

    await sendWelcomeEmail(user.email, user.username);

    const token = generateTokenAndSetCookie(res, user.id);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
    });

  } catch (error) {
    console.log("Verify Email Error: ", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Enter Credentials" });
    }
    if (!regex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid Email format" });
    }

    const [findUser] = await db1.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = findUser[0];

    if (user) {
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockout_until) - new Date()) / (1000 * 60));
        return res.status(403).json({ 
          success: false, 
          message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` 
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Invalid Password format" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        await db1.query('UPDATE users SET login_attempts = 0, lockout_until = NULL WHERE id = ?', [user.id]);

        if (!user.is_verified) {
          let code = user.verification_token;
          if (!code) {
            code = generateVerificationCode();
            await db1.query('UPDATE users SET verification_token = ? WHERE id = ?', [code, user.id]);
          }
          await sendVerificationEmail(user.email, code);
          return res.status(403).json({ success: false, message: "Please verify your email address. A new verification code has been sent." });
        }

        const token = generateTokenAndSetCookie(res, user.id);
        return res.status(200).json({
          success: true,
          message: "Login Success",
          token,
          user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
        });
      } else {
        const newAttempts = (user.login_attempts || 0) + 1;
        let lockoutUntil = null;
        let message = "Invalid credentials";

        if (newAttempts >= 3) {
          lockoutUntil = new Date(Date.now() + 10 * 60 * 1000);
          message = "Too many failed attempts. Account locked for 10 minutes.";
        } else {
          message = `Invalid credentials. ${3 - newAttempts} attempts remaining.`;
        }

        await db1.query('UPDATE users SET login_attempts = ?, lockout_until = ? WHERE id = ?', [newAttempts, lockoutUntil, user.id]);
        
        return res.status(401).json({ success: false, message });
      }
    }
    return res.status(400).json({ message: "Invalid credentials" });
  } catch (error) {
    console.log("Login Error: ", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID Token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture: avatar_url } = payload;

    if (!google_id || !email) {
      return res.status(400).json({ success: false, message: "Google account must have a verified email address." });
    }

    const [existingUsers] = await db1.query(
      'SELECT id, username, email, avatar_url, google_id FROM users WHERE google_id = ? OR email = ?',
      [google_id, email]
    );
    let user = existingUsers[0];

    if (user) {
      const needsUpdate = !user.google_id || user.avatar_url !== avatar_url;
      if (needsUpdate) {
        await db1.query(
          'UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?',
          [google_id, avatar_url, user.id]
        );
        user.google_id = google_id;
        user.avatar_url = avatar_url;
      }
    } else {
      let baseUsername = name
        ? name.replace(/\s+/g, '').toLowerCase().slice(0, 20)
        : 'user';

      if (baseUsername.length < 6) {
        baseUsername = baseUsername.padEnd(6, crypto.randomBytes(2).toString('hex'));
      }

      let username = baseUsername;
      let attempts = 0;
      while (attempts < 3) {
        const [collision] = await db1.query('SELECT id FROM users WHERE username = ?', [username]);
        if (collision.length === 0) break;
        username = baseUsername + crypto.randomBytes(2).toString('hex');
        attempts++;
      }

      const insertUser = `INSERT INTO users (username, email, password, google_id, avatar_url, is_verified) VALUES (?, ?, ?, ?, ?, ?)`;
      const [result] = await db1.query(insertUser, [username, email, null, google_id, avatar_url, true]);

      const userId = result.insertId;
      await db1.query('INSERT INTO wallets (user_id, value) VALUES (?, ?)', [userId, 20000]);
      await db1.query(
        'INSERT INTO portfolio_history (user_id, wallet_value, holdings_value, total_equity) VALUES (?, ?, ?, ?)',
        [userId, 20000, 0, 20000]
      );

      user = { id: userId, username, email, avatar_url };
    }

    const token = generateTokenAndSetCookie(res, user.id);

    return res.status(200).json({
      success: true,
      message: "Google Login Success",
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error during Google Auth" });
  }
};

export const logout = (req, res) => {
  res.clearCookie(process.env.TOKEN_NAME || "jwt_token", {
    httpOnly: true,
    secure: process.env.MODE === "production",
    sameSite: "lax",
    path: "/"
  });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};
