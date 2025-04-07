# Bytetools - Simple & Open-Source

Welcome to Bytetools, a collection of simple, open-source tools designed to work fast and without ads. This project was created out of a desire to have a set of tools that are efficient, easy to use, and free from the clutter of advertisements.

[![Cypress E2E Tests](https://github.com/werner-roman/bytetools/actions/workflows/cypress-tests.yml/badge.svg)](https://github.com/werner-roman/bytetools/actions/workflows/cypress-tests.yml)

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

## Testing

Bytetools uses Cypress for end-to-end (E2E) testing to ensure the tools work as expected. The tests simulate real user interactions and verify the output files against expected results.

### E2E Test Setup

The E2E tests are located in the `frontend/cypress/e2e` directory and test the following scenarios:

- **KMZ Reverse**: Tests uploading and reversing a KMZ file, then verifies the output matches the expected KMZ file
- **KMZ Merger (Standard Mode)**: Tests merging multiple KMZ files in standard mode
- **KMZ Merger (Advanced Mode)**: Tests merging KMZ files with advanced settings without reordering tracks
- **KMZ Merger (Advanced Mode with Reordering)**: Tests merging KMZ files with track reordering

### Running Tests Locally

To run the tests locally:

1. Ensure you have the test data files in the `frontend/cypress/fixtures/test-data` directory:
   - `testdata.kmz`: For reverse testing
   - `reversed_testdata.kmz`: Expected output for reverse testing
   - `merger_1.kmz`, `merger_2.kmz`, `merger_3.kmz`: For merger testing
   - `merged.kmz`: Expected output for standard merger
   - `merged_advanced_no_Reorder.kmz`: Expected output for advanced mode without reordering
   - `merged_advanced_Reorder.kmz`: Expected output for advanced mode with reordering
   - `merger_4.kmz`: For complex merger testing
   - `merged_advanced_Reorder_Complex.kmz`: Expected output for complex reordering

2. Start your development servers:

   ```sh
   # Terminal 1 - Start backend
   cd backend
   npm run start
   
   # Terminal 2 - Start frontend
   cd frontend
   npm run dev
   ```

3. Run the tests:

   ```sh
   # Run tests in headless mode
   cd frontend
   npm run test:e2e
   
   # Or open Cypress for interactive testing
   npx cypress open
   ```

### Continuous Integration

The project uses GitHub Actions to automatically run all E2E tests when:

- Code is pushed to the main branch
- A pull request is opened against the main branch

The workflow file `.github/workflows/cypress-tests.yml` defines the CI/CD pipeline, which:

1. Sets up the testing environment
2. Installs dependencies
3. Creates necessary environment variables
4. Starts the frontend and backend servers
5. Runs Cypress tests
6. Archives test artifacts (screenshots, videos) in case of failures

### Adding New Tests

When adding new tools or features to Bytetools, please include appropriate E2E tests that:

1. Verify the basic functionality works
2. Test edge cases and potential failure scenarios
3. Compare output files with expected results

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
