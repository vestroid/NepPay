const express = require('express')
const crypto = require('crypto');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { query } = require('../db')
const { sendEmail } = require("../utils/mailer")

const router = express.Router()

const saltRounds = 10

const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,}$/
const nameRegex = /^[a-zA-Z ]+$/
const pinRegex = /^\d{4}$|^\d{6}$/

const domain = process.env.DOMAIN
const baseDomain = domain
    ? (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`)
    : ""

const extractToken = (authHeader) => {
    if (!authHeader) return null

    const trimmed = authHeader.trim()
    if (!trimmed) return null

    const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i)
    return bearerMatch ? bearerMatch[1].trim() : trimmed
}

// helper functions
const isValidJWTToken = (token) => {
    const parsedToken = extractToken(token)
    if (!parsedToken) return false

    try {
        jwt.verify(parsedToken, process.env.JWT_SECRET, { ignoreExpiration: true })
        return true
    } catch (err) {
        console.log("JWT token invalid", err)
        return false
    }
}

const validateEmail = (email) => {
    if (email.length < 5 || !email.includes("@")){ // email less than 5 characters would be crazy
        return { valid: false, message: "Invalid Email"}
    }
    return { valid: true }
}

const validateUsername = (username) => {
    if (!username || username.length < 3 || !usernameRegex.test(username)) {
        return { valid: false, message: "Invalid Username" };
    }
    return { valid: true };
}

const validateName = (name) => {
    if (!name || name.length < 3 || !nameRegex.test(name)) {
        return { valid: false, message: "Invalid Name" };
    }
    return { valid: true };
}

const validatePassword = (password) => {
    if (!password || !passwordRegex.test(password)) {
        return {
            valid: false,
            message: "Password must contain 8+ characters and include uppercase, lowercase, a number, and at least one symbol (e.g. !@#$%^&*)."
        };
    }
    return { valid: true };
}

const validatePin = (pin) => {
    if (!pin || !pinRegex.test(pin)) {
        return { valid: false, message: "Invalid PIN" };
    }
    return { valid: true };
}

// Valid Username Check API
router.get('/checkUser', async (req, res) => {
    const username = req.query.username; // make sure to get the actual value
    if (!username) {
        return res.status(400).json({ error: "No username provided", available: false });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
        return res.status(400).json({ error: usernameCheck.message, available: false });
    }

    try {
        const q = "SELECT * FROM users WHERE username = $1";
        const values = [username];
        const { rows } = await query(q, values);

        return res.status(200).json({ available: rows.length === 0 });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Unknown Error" });
    }
});

// Register api
router.post('/register', async (req, res) => {
    const { username, name, password, pin, email } = req.body;

    // check all fields are present
    const required = { username, name, password, pin, email };
    for (const [key, value] of Object.entries(required)) {
        if (!value) {
            return res.status(400).json({ error: `Missing ${key}` });
        }
    }

    // validate each field
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return res.status(400).json({ error: emailCheck.message });

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.message });

    const nameCheck = validateName(name);
    if (!nameCheck.valid) return res.status(400).json({ error: nameCheck.message });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.message });

    const pinCheck = validatePin(pin.toString());
    if (!pinCheck.valid) return res.status(400).json({ error: pinCheck.message });

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
    const userAgent = req.headers['user-agent'];

    try {
        // hash sensitive info
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const hashedPin = await bcrypt.hash(pin.toString(), saltRounds);

        let defaultBal = 0;
        if (process.env.DEV_TEST === "true") {
            defaultBal = 500000;
        }

        const q = "INSERT INTO users (username, name, email, password, pin, last_login_ip, balance) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *";
        const values = [username, name, email, hashedPassword, hashedPin, ip, defaultBal];
        const { rows } = await query(q, values);

        // the user is now created and we should send the registeration successful email
        if (process.env.SEND_REGISTER_EMAIL === "true") {
            sendEmail({
                to: email,
                subject: "Welcome to NepPay!",
                text: `Welcome to NepPay! Your account has been successfully created. You can now start using our services to manage your payments securely. If you didn't sign up for this account, please contact our support team immediately.`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 10px;">
                        <h1 style="color: #2D3FE0;">Welcome to NepPay! 🚀</h1>
                        <p>Hi there,</p>
                        <p>Your account has been <strong>successfully created</strong>. We're excited to have you on board!</p>
                        <p>You can now log in to your dashboard to send, receive, and manage your payments with ease.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://neppay.com" style="background-color: #2D3FE0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
                        </div>
                        <p style="font-size: 12px; color: #888;">If you didn't create this account, please ignore this email or contact our support team.</p>
                        <hr style="border: 0; border-top: 1px solid #eee;" />
                        <p style="font-size: 12px; color: #aaa;">© 2024 NepPay Inc. All rights reserved.</p>
                    </div>
                `
            })
        }

        let jwtToken = null;
        try {
            jwtToken = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "7d" });
            const hashedToken = crypto.createHash('sha256').update(jwtToken).digest('hex');

            const q2 = "INSERT INTO sessions(user_id, token, ip_address, device_hint) VALUES ($1, $2, $3, $4) RETURNING *";
            const values2 = [rows[0].id, hashedToken, ip, userAgent];
            await query(q2, values2);
        } catch (err) {
            jwtToken = null; // fail gracefully
        }

        return res.status(200).json({
            message: "Account created successfully",
            token: jwtToken,
            user: { id: rows[0].id, username: rows[0].username, name: rows[0].name }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Unknown Error" });
    }
});

// Login api
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Please fill in every field" });

    const userAgent = req.headers['user-agent'] || "unknown";
    const ip = req.ip || req.connection.remoteAddress;

    try {
        // check if the user with the selected email exists
        const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
        if (!rows.length) return res.status(400).json({ error: "User not registered" });

        const user = rows[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid Password" });

        // check auth token if exists and invalidate it 
        const authHeader = req.headers['authorization'];
        const previousToken = extractToken(authHeader)
        const previousTokenHash = previousToken
            ? crypto.createHash('sha256').update(previousToken).digest('hex')
            : null;

        const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');

        // query to remove old session, update user last login and create new session
        const queryText = `
            WITH invalidated AS (
                UPDATE sessions
                SET invalidated_at = NOW()
                WHERE token = $1 AND invalidated_at IS NULL
            ),
            updated_user AS (
                UPDATE users
                SET last_login = NOW(),
                    last_login_ip = $2
                WHERE id = $3
                RETURNING *
            )
            INSERT INTO sessions(user_id, token, device_hint, last_login, ip_address)
            VALUES ($3, $4, $5, NOW(), $2)
            RETURNING *;
        `;

        const values = [previousTokenHash, ip, user.id, tokenHash, userAgent];

        await query(queryText, values);

        return res.status(200).json({
            message: "Login successful",
            token: jwtToken,
            user: { id: user.id, username: user.username, name: user.name }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Logout api, invalidates current session
router.post('/logout', async (req, res) => {
    // make sure an authentication token is passed
    const authHeader = req.headers['authorization'];
    const token = extractToken(authHeader)
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    // check jwt token to make sure its a valid token, doesnt check if token is expired 
    if (!isValidJWTToken(token)) return res.status(401).json({ error: "Unauthorized" });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const q = "UPDATE sessions SET invalidated_at = NOW() WHERE token = $1"
    const values2 = [tokenHash]
    await query(q, values2)

    return res.status(200).json({message: "Logout successful"})
})

// Reset pin/password api, invalidates every session on success
router.post('/reset', async (req, res) => {
    const type = req.query.type; // get the actual type value
    const { email, oldPassword, newPassword, oldPin, newPin } = req.body;

    // check if valid email
    const emailCheck = validateEmail(email);
    if (!email || !emailCheck.valid) {
        return res.status(400).json({ error: "Invalid Email" });
    }

    // check if valued password/pin
    if (type === "password") {
        if (!oldPassword || !newPassword || oldPassword === newPassword) {
            return res.status(400).json({ error: "Invalid Password, make sure both passwords are different" });
        }
        if (!validatePassword(newPassword).valid) {
            return res.status(400).json({ error: validatePassword(newPassword).message });
        }
    } else if (type === "pin") {
        if (!oldPin || !newPin || oldPin === newPin) {
            return res.status(400).json({ error: "Invalid Pin, make sure both pins are different" });
        }
        if (!validatePin(newPin.toString()).valid) {
            return res.status(400).json({ error: validatePin(newPin.toString()).message });
        }
    } else {
        return res.status(400).json({ error: "Invalid Type" });
    }

    try {
        // get user data
        const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
        if (!rows.length) return res.status(500).json({ error: "Internal Server Error"});

        const user = rows[0];

        // check old pin/password and update it
        if (type === "password") {
            const valid = await bcrypt.compare(oldPassword, user.password);
            if (!valid) return res.status(400).json({ error: "Old password is incorrect" });

            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

            await query("UPDATE users SET password = $1 WHERE id = $2", [hashedNewPassword, user.id]);

        } else if (type === "pin") {
            const valid = await bcrypt.compare(oldPin.toString(), user.pin);
            if (!valid) return res.status(400).json({ error: "Old pin is incorrect" });

            const hashedNewPin = await bcrypt.hash(newPin.toString(), saltRounds);
            await query("UPDATE users SET pin = $1 WHERE id = $2", [hashedNewPin, user.id]);
        }

        // invalidate all sessions on password change, no need for session logout on pin reset
        if (type === "password") {            
            await query("UPDATE sessions SET invalidated_at = NOW() WHERE user_id = $1", [user.id]);
        }

        return res.status(200).json({
            message: type === "password" ? "Password reset" : "Pin reset"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Unknown Error" });
    }
});

// Forget api, sends a password/pin reset link to the user
router.post('/forgot', async (req, res) => {
    const { email, type } = req.body;
    if (!email || !type) {
        return res.status(500).json({ error: "Missing fields" })
    }
    // generate a token for authentication 
    const token = crypto.randomBytes(64).toString('hex'); // 128 characters
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        let q = "SELECT * FROM users WHERE email = $1";
        let values = [email];
        let userExists = false;
        const { rows } = await query(q, values);
        if (rows.length) {
            userExists = true;
        }
        if (userExists) {
            const user = rows[0];

            q = "INSERT INTO resets (user_id, token, type) VALUES ($1, $2, $3) RETURNING *"
            values = [user.id, tokenHash, type];
            await query(q, values);
        } 
        // Define your reset link here
        const resetLink = `${baseDomain}/forgot?token=${token}&type=${type}`; // send type to make it easier to know what it is that you want to change, type will be checked later in the forgot handler

        sendEmail({
            to: email,
            from: {
                name: "NepPay Security",
                email: "security@yourdomain.com"
            },
            subject: "Reset your NepPay password",
            text: `We received a request to reset your NepPay password. Click the link below to choose a new one: \n\n ${resetLink} \n\n This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>We received a request to reset the password for your <strong>NepPay</strong> account.</p>
                    <p>Click the button below to set a new password. This link is only valid for the next <strong>60 minutes</strong>.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>

                    <p style="font-size: 14px; color: #555;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="font-size: 12px; color: #2D3FE0; word-break: break-all;">${resetLink}</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">If you did not request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
                    <p style="font-size: 12px; color: #888;">&copy; 2024 NepPay Security Team</p>
                </div>
            `
        });
        
        return res.status(200).json({ message: "If your email exists, a reset link has been sent."})
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Unknown Error" });
    }
})

// Reset Password If Forgotten api
router.post('/forgot-password', async (req, res) => {
    const { token, password } = req.body;
    const type = "password"

    // make sure both params exist
    if (!token || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }
    const passwordDetails = validatePassword(password)
    if (!passwordDetails.valid) {
        return res.status(400).json({ error: passwordDetails.message });
    }
    try {
        // check if token exists in table and is valid, if valid, mark as used
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { rows } = await query(
            `   UPDATE resets
                SET used_at = NOW()
                WHERE token = $1
                    AND type = $2
                    AND used_at IS NULL
                    AND expires_at > NOW()
                RETURNING *
            `,
            [tokenHash, type]
        ) 

        if (!rows.length){
            return res.status(401).json({ error: "Invalid/Expired Token" })
        }

        const user_id = rows[0].user_id;

        // change the password 
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await query(
            "UPDATE users SET password = $1 WHERE id = $2",
            [passwordHash, user_id]
        )

        // invalidate all sessions 
        await query(
            "UPDATE sessions SET invalidated_at = NOW() WHERE user_id = $1",
            [user_id]
        )
         
        return res.status(200).json({ message: "Password reset successful" })
    }
    catch(err) {
        return res.status(500).json({ error: "Unknown Error" })
    }
})

// Reset Pin If Forgotten api
router.post('/forgot-pin', async (req, res) => {
    const { token, pin } = req.body;
    const type = "pin"

    // make sure both params exist
    if (!token || !pin) {
        return res.status(400).json({ error: "Missing fields" });
    }
    const pinDetails = validatePin(pin.toString())
    if (!pinDetails.valid) {
        return res.status(400).json({ error: pinDetails.message });
    }
    try {
        // check if token exists in table and is valid, if valid, mark as used
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { rows } = await query(
            `   UPDATE resets
                SET used_at = NOW()
                WHERE token = $1
                    AND type = $2
                    AND used_at IS NULL
                    AND expires_at > NOW()
                RETURNING *
            `,
            [tokenHash, type]
        ) 

        if (!rows.length){
            return res.status(401).json({ error: "Invalid/Expired Token" })
        }

        const user_id = rows[0].user_id;

        // change the pin 
        const pinHash = await bcrypt.hash(pin.toString(), saltRounds);

        await query(
            "UPDATE users SET pin = $1 WHERE id = $2",
            [pinHash, user_id]
        )

        // we dont need to invalidate session on pin changes
         
        return res.status(200).json({ message: "Pin reset successful" })
    }
    catch(err) {
        return res.status(500).json({ error: "Unknown Error" })
    }
})

module.exports = router;
