# NexCart Frontend (Client)

This is the React-based frontend for the NexCart platform, built with modern web technologies.

## Tech Stack

- **Framework**: React 19 (Vite)
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router DOM v7
- **Charts**: Recharts

## Getting Started

### 1. Installation

From the project root:

```bash
npm run client:install
```

Or from this directory:

```bash
npm install
```

### 2. Development

Run the development server (proxies API requests to localhost:5000):

```bash
npm run dev
```

### 3. Build

Create a production build in the `dist` folder:

```bash
npm run build
```

## Directory Structure

- `src/api`: Axios instances and API wrappers.
- `src/components`: Reusable UI components.
- `src/layouts`: Page layouts for different user roles (Customer, Wholesaler, Admin).
- `src/pages`: Main application views.
- `src/store`: Zustand state stores.
- `src/utils`: Helper functions and class merging utilities.

## Environment Variables

Create a `.env` file if custom overrides are needed:

```properties
VITE_API_URL=http://localhost:5000/api
```
