# Machine-To-Machine (M2M) Backend (Beta)

A secure backend service for the M2M platform that handles DID operations, authentication, and verifiable credentials.

## Features

- DID (Decentralized Identifier) creation and management
- User authentication with JWT and authorization
- Verifiable credentials creation, signing, and verification
- Stripe payment integration for subscription services
- Contact form and communication management
- Web5 protocol integration
- Email notifications

## Prerequisites

- Node.js v18.12.1 or higher
- MongoDB v4.4 or higher
- NPM or Yarn package manager

## Tech Stack

- Express.js - Web framework
- MongoDB with Mongoose - Database
- Web5 API - Decentralized identifiers and verifiable credentials
- JWT - Authentication
- Nodemailer - Email services
- Stripe API - Payment processing

## Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd m2m-beta-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```
Then edit `.env` with your configuration values.

## Running the Application

Development mode with hot-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### DID Management
- `POST /api/did/create` - Create a new DID
- `GET /api/did/list` - List all DIDs for user
- `GET /api/did/:id` - Get DID details

### Verifiable Credentials
- `POST /api/vc/create` - Create a new verifiable credential
- `POST /api/vc/verify` - Verify a credential
- `GET /api/vc/list` - List all VCs for user

### Registration
- `POST /api/register` - Register a new entity
- `GET /api/register/:id` - Get registration details

### Payments
- `POST /api/payment/create-checkout` - Create Stripe checkout session
- `POST /api/payment/webhook` - Handle Stripe webhooks

### Contact
- `POST /api/contact` - Submit contact form
