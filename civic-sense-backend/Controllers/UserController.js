const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken, setAuthCookies } = require("../Utils/tokenUtils");
const userModel = require("../Models/User");
const Complaint = require("../Models/Complaints");

const registerUser = async (req, res) => {
    const { userName, userEmail, userAddress, userPassword, userConfirmPassword } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!emailRegex.test(userEmail)) {
        return res.status(400).json({ status: "error", message: "Invalid email address" });
    }

    if (!passwordRegex.test(userPassword)) {
        return res.status(400).json({ status: "error", message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" });
    }

    if (userPassword != userConfirmPassword) {
        return res.status(400).json({ status: "error", message: "Password does not match" });
    }

    try {
        const user = await userModel.find({
            userEmail: userEmail,
            isDeleted: false
        });
        if (user.length > 0) {
            return res.status(400).json({ status: "error", message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(userPassword, salt);

        const newUser = new userModel({
            userName: userName,
            userEmail: userEmail,
            userAddress: userAddress,
            userPassword: hashedPassword
        });

        await newUser.save();

        res.status(200).json({ status: "success", message: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
}

const loginUser = async (req, res) => {
    const { userEmail, userPassword } = req.body;
    try {
        if (!userEmail || !userPassword)
            return res.status(400).json({ message: "Missing credentials" });

        const user = await userModel.findOne({ userEmail });
        if (!user)
            return res.status(401).json({ status: "error", message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(userPassword, user.userPassword);
        if (!isMatch)
            return res.status(401).json({ status: "error", message: "Invalid credentials" });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        setAuthCookies(res, accessToken, refreshToken);

        res.json({
            message: "Login successful",
            user: {
                _id: user._id,
                userName: user.userName,
                userEmail: user.userEmail,
                role: user.userRole,
                userDepartment: user.userDepartment
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token)
        return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await userModel.findById(decoded.userId);

    if (!user || user.refreshToken !== token)
        return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({ message: "Token refreshed" });
};

const logoutUser = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
            await userModel.findByIdAndUpdate(decoded.userId, { refreshToken: null });
        }
    } catch (error) {
        console.log("Logout error (likely invalid token):", error.message);
    } finally {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        });
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        });
        return res.status(200).json({ message: "Logged out successfully" });
    }
}

const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Complaint.aggregate([
            {
                $group: {
                    _id: "$complaintUser",
                    totalComplaints: { $sum: 1 },
                    resolvedComplaints: {
                        $sum: {
                            $cond: [{ $eq: ["$complaintStatus", "Resolved"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $project: {
                    _id: 1,
                    userName: "$userDetails.userName",
                    userEmail: "$userDetails.userEmail",
                    totalComplaints: 1,
                    resolvedComplaints: 1,
                    impactPoints: {
                        $add: [
                            { $multiply: ["$totalComplaints", 10] },
                            { $multiply: ["$resolvedComplaints", 20] }
                        ]
                    }
                }
            },
            {
                $sort: { impactPoints: -1 }
            },
            {
                $limit: 10
            }
        ]);

        res.status(200).json({ status: "success", data: leaderboard });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshToken,
    logoutUser,
    getLeaderboard
}