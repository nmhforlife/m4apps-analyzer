# More4apps Catalog Analyzer

A comprehensive web application for analyzing More4apps catalog files from Oracle E-Business Suite environments.

## Features

- **File Upload & Parsing**: Import and analyze More4apps catalog files
- **System Overview**: View instance details, database info, and node configurations
- **Package Analysis**: Review installed packages, versions, and compatibility
- **Wizard Usage**: Monitor wizard connections and user activity
- **Health Monitoring**: Identify invalid objects and compilation errors
- **Recommendations**: Get upgrade suggestions and compatibility advice
- **Comparison**: Compare multiple environments side-by-side

## Architecture

- **Frontend**: React with Material-UI for responsive dashboard
- **Backend**: Node.js/Express API with file processing
- **Parser**: Custom catalog file parser with structured data extraction
- **Analysis**: Version comparison and recommendation engine

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Development

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Open http://localhost:3000 in your browser

## Usage

1. Upload a More4apps catalog file (.txt)
2. View the parsed system information and analysis
3. Compare with other environments
4. Review recommendations for upgrades or fixes

## Project Structure

```
m4aps-analyzer/
├── backend/          # Express.js API server
├── frontend/         # React dashboard application
├── docs/            # Documentation
└── examples/        # Sample catalog files
```

## License

MIT License