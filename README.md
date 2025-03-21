# Bytetools - Simple & Open-Source

Welcome to Bytetools, a collection of simple, open-source tools designed to work fast and without ads. This project was created out of a desire to have a set of tools that are efficient, easy to use, and free from the clutter of advertisements.

## Website

You can access the live website here: [Bytetools](https://bytetools.org)

## Features

- **Open-Source**: All tools are open-source, and the code is available for anyone to inspect, modify, and improve.
- **No Ads**: Enjoy a clean, ad-free experience.
- **Fast Performance**: Tools are designed to be lightweight and fast, ensuring a smooth user experience.

## Tools Available

- **KMZ-Reverse**: Reverse the direction of a KMZ file.
- **KMZ-Merger**: Merge multiple KMZ files into one.
- **Strava bulk downloader**: Download multiple activities by amount or date range.

## Getting Started

To get started with the project locally, follow these steps:

### Prerequisites

- [Clerk](https://clerk.com) account
- [Strava](https://strava.com) acconut

1. Clone the repository:

   ```sh
   git clone https://github.com/werner-roman/bytetools.git
   cd bytetools
   ```

2. Navigate to the frontend and  directory and install dependencies:

   ```sh
   cd frontend
   npm install
   
   cd ..
   
   cd backend
   npm install
   ```

3. Set the local variables
   - Backend

   ```sh
      PORT=3001 # Where the backend is running
      FRONTEND_URL=http://localhost:5173 # Most likeley with npm run dev (vite)
      STRAVA_CLIENT_ID=XXXXXX # Set it up here: https://www.strava.com/settings/api
      STRAVA_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX # Set it up here: https://www.strava.com/settings/api
      STRAVA_REDIRECT_URI=http://localhost:5173 # Most likeley with npm run dev (vite)
      CLERK_PUBLISHABLE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX # Set it up here: https://dashboard.clerk.com/ -> Configure -> API Keys
      CLERK_SECRET_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX # Set it up here: https://dashboard.clerk.com/ -> Configure -> API Keys
      SVIX_API_URL=https://api.svix.com # Needed for the CORS in the Backend - Webhook by Clerk
   ```

   - Frontend
  
   ```sh
   VITE_BACKEND_URL=http://localhost:3001 # Where the backend is running
   VITE_STRAVA_CLIENT_ID=XXXXX # Set it up here: <https://www.strava.com/settings/api>
   VITE_STRAVA_REDIRECT_URI=http://localhost:5173 # Most likeley with npm run dev (vite)
   VITE_CLERK_PUBLISHABLE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX # Set it up here: https://dashboard.clerk.com/ -> Configure -> API Keys
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open your browser and go to `http://localhost:5173` to see the application in action.

## Limitations

If a user signs up there is a Webhook from clerk (user.created) whoch calls the endpoint /set-default-credits this cannot be tested with this setup. Go to the Clerk dashboard and set the Metadata -> Private manually:

```json
{
  "credits": 5
}
   ```

## Contributing

We welcome contributions from the community! If you have an idea for a new tool, a bug fix, or an improvement, please feel free to submit a pull request. Here are some ways you can contribute:

- **Report Bugs**: If you find a bug, please report it by opening an issue.
- **Suggest Features**: If you have an idea for a new feature, let us know by opening an issue.
- **Submit Pull Requests**: If you have a fix or a new feature, submit a pull request with your changes.

## Feedback

Your feedback is important to us. If you have any suggestions or comments, please feel free to reach out. You can open an issue on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Thank you for using Bytetools! We hope you find it useful and look forward to your contributions and feedback.

[Bytetools](https://bytetools.org)
