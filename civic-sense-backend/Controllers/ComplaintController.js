const Complaint = require("../Models/Complaints");
const cloudinary = require("../Utils/cloudinary");
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const getDepartmentFromCategory = (category) => {
    // If the category is already a full department name, return it
    if (category.includes('Department')) {
        return category;
    }

    switch (category) {
        case 'Roads': return 'Roads Department';
        case 'Garbage': return 'Sanitation Department';
        case 'Water': return 'Water Department';
        case 'Electricity': return 'Power Department';
        case 'Traffic': return 'Traffic Department';
        case 'Fire': return 'Fire Department';
        case 'Medical': return 'Health Department';
        default: return 'General Administration';
    }
};

const createComplaint = async (req, res) => {
    try {
        const { title, description, category, location, priority, aiScore } = req.body;
        console.log("Create Complaint Body:", req.body);
        console.log("Received AI Score:", aiScore); // Debug log
        const userId = req.user._id; // From authMiddleware (payload has userId)

        if (!title || !description || !category || !location || !priority) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let imageUrl = "";

        if (req.file) {
            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "civic-sense/complaints",
            });
            imageUrl = result.secure_url;

            // Remove file from local storage after upload
            // Note: multer stores file in a temporary location if dest is set, 
            // or in memory if not. We'll configure multer later. 
            // Assuming diskStorage for now to keep it simple with cloudinary upload.
            // If using memoryStorage, we'd stream it. Let's assume diskStorage and delete.
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } else {
            return res.status(400).json({ message: "Image evidence is required" });
        }

        const newComplaint = new Complaint({
            complaintId: `CMP-${Date.now()}`,
            complaintDescription: description,
            complaintImage: imageUrl,
            complaintLocation: location,
            complaintType: category,
            complaintPriority: priority,
            complaintUser: userId,
            complaintAuthority: getDepartmentFromCategory(category),
            complaintAIScore: (aiScore && !isNaN(parseFloat(aiScore))) ? parseFloat(aiScore) : 0
        });

        // Re-mapping to match model
        newComplaint.complaintDescription = `**${title}**\n${description}`;

        await newComplaint.save();

        // Check for High Priority / Emergency
        if (priority === 'High' || priority === 'Emergency') {
            const { Notification } = require('../Models/Notification');

            // Create notification for Authority
            const newNotification = new Notification({
                recipient: 'Authority',
                message: `EMERGENCY COMPLAINT: ${title} - ${category}`,
                type: 'Emergency',
                relatedId: newComplaint.complaintId
            });
            await newNotification.save();

            // Emit socket event to authorities
            const io = req.app.get('io');
            if (io) {
                io.emit('new_emergency_complaint', {
                    complaint: newComplaint,
                    notification: newNotification
                });
                console.log("Emitted new_emergency_complaint event");
            }
        }

        res.status(201).json({ message: "Complaint registered successfully", complaint: newComplaint });

    } catch (error) {
        console.error("Error creating complaint:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getUserContributions = async (req, res) => {
    try {
        const userId = req.user._id;
        const contributions = await Complaint.find({ complaintUser: userId }).sort({ createdAt: -1 });

        res.status(200).json({
            status: "success",
            data: contributions
        });
    } catch (error) {
        console.error("Error fetching contributions:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const predictComplaint = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: "Text is required for prediction" });
        }

        // Call Python AI Microservice
        const response = await axios.post('http://localhost:5001/predict', { text });

        res.json(response.data);
    } catch (error) {
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ message: "AI Service Unavailable", error: error.message });
    }
};

const generateCaption = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        // Prepare form data for Python API
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));

        // Call Python Image Captioning Service
        const response = await axios.post('http://localhost:5002/caption', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json(response.data);
    } catch (error) {
        console.error("Error generating caption:", error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Caption Service Unavailable", error: error.message });
    }
};

const getAuthorityComplaints = async (req, res) => {
    try {
        const authorityDepartment = req.user.userDepartment; // Assuming added to token or fetched

        // If authority has no department (e.g. Super Admin), show all? Or handle error.
        // Assuming "General Administration" sees all or specific.
        // For now, strict matching.

        let query = {};
        if (authorityDepartment && authorityDepartment !== 'General Administration') {
            query = { complaintAuthority: authorityDepartment };
        }

        const complaints = await Complaint.find(query)
            .populate('complaintUser', 'userName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: "success",
            data: complaints
        });
    } catch (error) {
        console.error("Error fetching authority complaints:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


const getAuthorityStats = async (req, res) => {
    try {
        const authorityDepartment = req.user.userDepartment;

        // Base query
        let query = {};
        if (authorityDepartment && authorityDepartment !== 'General Administration') {
            query = { complaintAuthority: authorityDepartment };
        }

        // Get total count
        const totalComplaints = await Complaint.countDocuments(query);

        // Get resolved count
        const resolvedComplaints = await Complaint.countDocuments({ ...query, complaintStatus: 'Resolved' });

        // Get pending count (Pending + In Progress)
        const pendingComplaints = await Complaint.countDocuments({ ...query, complaintStatus: { $in: ['Pending', 'In Progress'] } });

        // Calculate Average AI Confidence
        const complaintsWithScore = await Complaint.find({ ...query, complaintAIScore: { $gt: 0 } });
        let avgConfidence = 0;
        if (complaintsWithScore.length > 0) {
            const totalScore = complaintsWithScore.reduce((acc, curr) => acc + curr.complaintAIScore, 0);
            avgConfidence = Math.round(totalScore / complaintsWithScore.length);
        }

        // AI Confidence Distribution
        const confidenceDistribution = [
            { name: 'High (>80%)', value: await Complaint.countDocuments({ ...query, complaintAIScore: { $gt: 80 } }) },
            { name: 'Medium (50-80%)', value: await Complaint.countDocuments({ ...query, complaintAIScore: { $gte: 50, $lte: 80 } }) },
            { name: 'Low (<50%)', value: await Complaint.countDocuments({ ...query, complaintAIScore: { $lt: 50, $gt: 0 } }) }
        ];

        // Category Stats for AI Chart
        const categoryStats = await Complaint.aggregate([
            { $match: query },
            { $group: { _id: "$complaintType", count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            status: "success",
            data: {
                total: totalComplaints,
                resolved: resolvedComplaints,
                pending: pendingComplaints,
                avgConfidence: avgConfidence,
                confidenceDistribution,
                categoryStats
            }
        });

    } catch (error) {
        console.error("Error fetching authority stats:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        // Try to find by complaintId (custom ID) first, or fallback to _id if it looks like an ObjectId
        let complaint = await Complaint.findOne({ complaintId: id });

        if (!complaint && id.match(/^[0-9a-fA-F]{24}$/)) {
            complaint = await Complaint.findById(id);
        }

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        complaint.complaintStatus = status;
        if (notes !== undefined) {
            complaint.complaintNotes = notes;
        }
        if (status === 'Resolved') {
            complaint.complaintResolvedDate = Date.now();
            complaint.complaintResolvedBy = req.user._id;
        }

        await complaint.save();

        res.status(200).json({ message: "Status updated successfully", complaint });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


module.exports = { createComplaint, getUserContributions, predictComplaint, generateCaption, getAuthorityComplaints, getAuthorityStats, updateComplaintStatus };
