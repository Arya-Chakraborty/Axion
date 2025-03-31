const User = require("../../models/user"); // Import User Model

const loginUser = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Request body is empty" });
    }
    try {
        
        const name = req.body?.name;
        const email = req.body?.email[0]?.emailAddress;

        if (!email || !name) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if the user already exists in DB
        let user = await User.findOne({ email });

        if (!user) {
            // If user does not exist, create a new one
            user = new User({ email, name });
            await user.save();
            return res.status(201).json({ message: "User added to database", user });
        }

        res.status(200).json({ message: "User already exists", user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { loginUser };
