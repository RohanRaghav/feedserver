require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});

const userSchema = new mongoose.Schema({
    name: String,
    uid: { type: String, unique: true },
    department: String,
    occupation: String,
    email: String,
    scheduleMeeting: Boolean,
    selected: Boolean,
    meetingDate: Date,
    meetingTime: String,
});

const deselectedSchema = new mongoose.Schema({
    userId: String,
    name: String,
    uid: String,
    department: String,
    occupation: String,
    email: String,
    reason: String,
});

// Define the Card schema
const cardSchema = new mongoose.Schema({
  _id: String, // Add an ID
  title: String,
  content: String,
  image: String,
  alt: String,
  likes: {
    type: Number,
    default: 0
  }
});

const Card = mongoose.model('Card', cardSchema);


const User = mongoose.model('User', userSchema);
const Diselected = mongoose.model('Diselected', deselectedSchema);
// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // Use port 587 for TLS (STARTTLS)
    secure: false, // Set to false for TLS (STARTTLS), true for SSL on port 465
    auth: {
        user: process.env.GMAIL_USER, // Your Gmail address from the environment variable
        pass: process.env.GMAIL_PASS, // Your Gmail app password or Gmail account password
    },
    tls: {
        rejectUnauthorized: false // Optional: Use this if you have issues with TLS certificates
    }
});
app.get('/get-likes/:id', async (req, res) => {
    try {
      const card = await Card.findById(req.params.id);
      if (!card) return res.status(404).json({ error: 'Card not found' });
  
      res.json({ likes: card.likes });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Route to like a card (increment likes)
  app.post('/like-card/:id', async (req, res) => {
    try {
      const card = await Card.findById(req.params.id);
      if (!card) return res.status(404).json({ error: 'Card not found' });
  
      // Increment likes by 1
      card.likes += 1;
      await card.save();
  
      res.json({ likes: card.likes });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
// POST route to handle registration
app.post('/api/register', async (req, res) => {
    const { name, uid, department, occupation, email, scheduleMeeting, selected } = req.body;

    try {
        // Check if the UID is already registered
        const existingUser = await User.findOne({ uid });
        if (existingUser) {
            return res.status(400).json({ message: 'UID already registered' });
        }

        // Create a new user
        const newUser = new User({ name, uid, department, occupation, email, scheduleMeeting, selected });
        await newUser.save();

        // Create transporter using environment variables for Gmail credentials
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // You can use other services like 'Yahoo', 'Outlook', or custom SMTP settings
            auth: {
                user: process.env.GMAIL_USER, // Fetch Gmail user from environment variables
                pass: process.env.GMAIL_PASS, // Fetch Gmail password from environment variables
            },
        });

        // Email options with personalized details
        const mailOptions = {
            from: `"Rohan Raghav" <${process.env.GMAIL_USER}>`, // Use Gmail user from environment
            to: email, // Recipient's email
            subject: 'Thank you for joining our club!',
            text: `Hi ${name},\n\nThank you for joining our club! We are excited to have you with us.\n\nPlease keep an eye on your Gmail, as your interview will be scheduled soon.\n\nBest Regards,\nRohan Raghav`, // Plain text body
            html: `<b>Hi ${name},</b><br><br>Thank you for joining our club! We are excited to have you with us.<br><br>Please keep an eye on your Gmail, as your interview will be scheduled soon.<br><br>Best Regards,<br><b>Rohan Raghav</b>`, // HTML email body
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Registration email sent:', info.response);

        // Respond with success message
        res.status(201).json({ message: 'Applied successfully' });

    } catch (error) {
        // Handle server errors
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// Schedule meeting API
app.post("/api/schedule-meeting", async (req, res) => {
    const { userId, date, time } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.scheduleMeeting = true;
        user.meetingDate = date;
        user.meetingTime = time;
        await user.save();

        // Send email notification
        const info = await transporter.sendMail({
            from: '"rohanraghav81" <rohanraghav81@gmail.com>', // Sender's Gmail
            to: user.email, // Receiver's email
            subject: "Meeting Scheduled",
            text: `Your meeting is scheduled on ${date} at ${time}.`,
            html: `<b>Your meeting is scheduled on ${date} at ${time}.</b>`,
        });

        console.log("Message sent: %s", info.messageId);
        res.json({ message: "Meeting scheduled and email sent successfully!" });
    } catch (error) {
        console.error("Error scheduling meeting:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// Select user API
app.patch('/api/select-user/:id', async (req, res) => {
    const { id } = req.params;
    const { selected } = req.body;

    try {
        if (selected) {
            await User.findByIdAndUpdate(id, { selected: true });
            res.json({ message: 'User selected successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Deselect user API
app.post('/api/deselect-user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    try {
        const user = await User.findById(userId);
        await Diselected.create({
            userId: user._id,
            name: user.name,
            uid: user.uid,
            department: user.department,
            occupation: user.occupation,
            email: user.email,
            reason: reason,
        });

        await User.findByIdAndDelete(userId);
        res.json({ message: 'User deselected and removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deselecting the user' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
