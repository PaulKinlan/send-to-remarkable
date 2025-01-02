
# Remarkable Email Gateway

A web application that allows you to send documents to your reMarkable tablet via email. Simply register your device, get a unique email address, and send documents as email attachments.

## Features

- Email to reMarkable tablet forwarding
- Secure user authentication
- Multiple device support
- PDF conversion for HTML emails
- Support for PDF and EPUB attachments

## Tech Stack

- Frontend: React with TypeScript
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- Email: SendGrid
- Styling: Tailwind CSS with shadcn/ui
- Authentication: Passport.js

## Getting Started

1. Fork this Repl in Replit
2. Set up the required environment variables in the Secrets tab:
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `APP_URL`: Your application URL
   - `DATABASE_URL`: Your PostgreSQL database URL
   - `SESSION_SECRET`: A secure random string for session management

3. Click the Run button to start the development server

## Usage

1. Register an account and verify your email
2. Register your reMarkable tablet using a one-time code from your device
3. Get your unique email address for the registered device
4. Send documents as email attachments to that address
5. Find the documents on your reMarkable tablet

## Development

The project uses:
- `npm run dev` for development
- `npm run build` for production builds
- `npm run start` to run the production server

## Deployment

This project is configured for deployment on Replit. Use the Deployment tab to deploy your changes.
