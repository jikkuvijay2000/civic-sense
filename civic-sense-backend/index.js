const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");

const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { userRouter } = require("./Router/userRouter");
const { complaintRouter } = require("./Router/complaintRouter");
const { noteRouter } = require("./Router/noteRouter");
const { communityPostRouter } = require("./Router/communityPostRouter");

const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.set('trust proxy', 1); // Enable trust proxy for Render
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit each IP to 10 login/register requests per hour
    message: "Too many login attempts, please try again after an hour"
});

app.use('/user', authLimiter, userRouter)
app.use('/complaint', complaintRouter)
app.use('/note', noteRouter)
app.use('/community-post', communityPostRouter)

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.log(error);
    });

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
});

