import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkClient } from '@clerk/express';

dotenv.config({ path: '.env.local' }); // Load environment variables from .env.local

const app = express();
const port = 3001;

const allowedOrigins = [process.env.FRONTEND_URL, process.env.SVIX_API_URL]; // Add SVIX_API_URL to allowed origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('Origin:', origin);
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;

app.post('/strava/token', async (req, res) => {
  const { code } = req.body;

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: STRAVA_REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      res.json(data);
    } else {
      res.status(400).json({ error: data.message || 'Failed to exchange code for token' });
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/set-default-credits', async (req, res) => {
  try {
    // Extract userId directly from the "data" object in the request body
    const { id: userId } = req.body.data;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    // Fetch the user from Clerk
    const user = await clerkClient.users.getUser(userId);

    // Check if the user already has credits in privateMetadata
    if (!user.privateMetadata.credits) {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { credits: 5 }, // Set default credits to 5
      });
    }

    res.status(200).json({ message: 'Default credits set successfully.' });
  } catch (error) {
    console.error('Error setting default credits:', error);
    res.status(500).json({ error: 'Failed to set default credits.' });
  }
});

app.post('/deduct-credits', async (req, res) => {
  const { userId, activitiesCount } = req.body;

  try {
    // Step 1: Check if the user has enough credits
    const user = await clerkClient.users.getUser(userId);
    const currentCredits = user.privateMetadata.credits || 0;

    if (currentCredits < activitiesCount) {
      return res.status(400).json({ error: 'Not enough credits.' });
    }

    // Step 2: Deduct the credits
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { credits: currentCredits - activitiesCount },
    });

    res.status(200).json({ message: 'Credits deducted successfully.' });
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ error: 'Failed to deduct credits.' });
  }
});

app.get('/get-credits', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const credits = user.privateMetadata.credits || 0;
    res.status(200).json({ credits });
  } catch (error) {
    console.error('Error getting credits:', error);
    res.status(500).json({ error: 'Failed to get credits.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
