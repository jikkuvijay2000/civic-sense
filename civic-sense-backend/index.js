const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require('http');
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { userRouter } = require("./Router/userRouter");
const { complaintRouter } = require("./Router/complaintRouter");
const { noteRouter } = require("./Router/noteRouter");
const { communityPostRouter } = require("./Router/communityPostRouter");
const aiChatRouter = require("./Router/aiChatRouter");

const app = express();
const server = http.createServer(app);

// ── Trust Render's reverse proxy (required for rate-limiter & cookies) ──
app.set('trust proxy', 1);

// ── Parse allowed origins from env (comma-separated list) ──
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(',')
    .map(o => o.trim());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
};

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware for Socket Authentication
io.use((socket, next) => {
    let token = null;

    if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
    }

    if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(socket.handshake.headers.cookie.split('; ').map(c => c.split('=')));
        token = cookies.accessToken;
    }

    if (!token) return next(new Error("Authentication error: No token found in auth payload or cookies"));

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("Authentication error: Invalid token"));
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    socket.join(socket.user.userId);

    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    });
});

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: "Too many login attempts, please try again after an hour"
});

// ── Health-check (Render pings this to confirm the service is alive) ──
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Civic Connect API' }));

app.use('/user', authLimiter, userRouter);
app.use('/complaint', complaintRouter);
app.use('/note', noteRouter);
app.use('/community-post', communityPostRouter);
app.use('/api/chat', aiChatRouter);

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => console.log(error));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

