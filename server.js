require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json()); // Updated to parse JSON
app.use(cors());

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error.message);
});

const feedbackSchema = new mongoose.Schema({
  ratings: [String], // Array of ratings
  coordinatorName: { type: String },
  coordinatorRating: { type: String },
  teamName: { type: String },
  email: { type: String }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Submit Feedback Route
app.post('/submit-feedback', async (req, res) => {
  const {
     ratings,
    coordinatorName, coordinatorRating, teamName, email,
  } = req.body;

  try {
    const feedbackDocument = new Feedback({
      ratings,
      coordinatorName,
      coordinatorRating,
      teamName,
      email
    });

    await feedbackDocument.save();
    console.log('Feedback data:', feedbackDocument); // Log feedback data to console
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
