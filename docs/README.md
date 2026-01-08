# Admin System - AI Image & Video Generation Platform

Vue 3 + Element Plus admin dashboard for managing the AI generation platform.

## Features

- User management (view, edit, delete users)
- Image model management (add, edit, enable/disable models)
- Video model management (configure generation providers)
- Content moderation (review public works)
- Dashboard with platform statistics
- JWT-based authentication

## Tech Stack

- Vue 3 + Composition API
- Element Plus UI framework
- Vue Router
- Axios for API calls

## Installation

```bash
npm install
```

## Configuration

Update API endpoint in `src/api/index.js` to point to your backend server.

## Running

```bash
# Development
npm run dev

# Build
npm run build
```

## Routes

- `/login` - Admin login
- `/dashboard` - Platform statistics
- `/users` - User management
- `/models` - Image model management
- `/video-models` - Video model management
- `/content` - Content moderation

## Authentication

Admin credentials are managed through the backend. Default admin username/password should be configured in the backend database.

## License

MIT
