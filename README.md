# docucr Frontend

The modern web interface for the docucr document processing platform.

## Tech Stack

- **Framework**: [React](https://react.dev/) (Create React App)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [PrimeReact](https://primereact.org/) & [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/) & PrimeIcons
- **Routing**: [React Router](https://reactrouter.com/)
- **State Management**: Context API / Custom Store
- **HTTP Client**: Native Fetch / Custom Service Layer

## Prerequisites

- Node.js (v18+ recommended)
- npm

## Installation

```bash
# Install dependencies
npm install
```

## Running the Application

### Development Mode
Runs the app in development mode. Open [http://localhost:4200](http://localhost:4200) to view it in the browser.

```bash
npm start
```

### Local Backend Development
If you are running the backend locally on port 8000, use:

```bash
npm run start:local
```
*This configures the API URL to point to `http://localhost:8000/api/v1`.*

## Building for Production

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/               # Application routes/pages
├── services/            # API integration services (Auth, Documents, etc.)
├── store/               # State management logic
├── styles/              # Global styles and themes
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
├── App.tsx              # Main application component
└── index.tsx            # Entry point
```

## Environment Variables

The application uses `cross-env` to handle environment variables for scripts. Key variables include:

- `REACT_APP_API_URL`: Base URL for the backend API.

## AWS Deployment

The project includes scripts for automated deployment to AWS (S3 + CloudFront).

### Deploy Script
Located in `deploy/deploy.sh`, this script builds the application and uploads the artifacts to S3.

```bash
cd deploy
./deploy.sh
```

### Infrastructure
See [deploy/TERRAFORM-README.md](deploy/TERRAFORM-README.md) for details on the underlying infrastructure (S3 Bucket, CloudFront Distribution).
