# Gopark - Angular Application

## Overview
This is an Angular 20 application with Server-Side Rendering (SSR) support using Express. The project was imported from GitHub and configured to run in the Replit environment.

## Project Architecture
- **Framework**: Angular 20.3.0
- **SSR**: Angular SSR with Express server
- **Build System**: Angular CLI
- **Package Manager**: npm
- **Firebase Integration**: Configured (see firebase.json)

## Development Setup
The application is configured to run on port 5000 with the Angular development server. The dev server is configured to:
- Listen on `0.0.0.0:5000` (required for Replit's proxy)
- Allow all hosts (required for Replit's iframe preview)
- Auto-reload on file changes

## Project Structure
```
src/
  app/          - Application components and routing
  server.ts     - Express server for SSR
  main.ts       - Client-side entry point
  main.server.ts - Server-side entry point
public/         - Static assets
```

## Recent Changes (November 20, 2025)
- Configured Angular dev server to run on port 5000
- Set host to 0.0.0.0 and enabled all hosts for Replit compatibility
- Installed all npm dependencies
- Set up development workflow

## Scripts
- `npm start` or `ng serve` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run serve:ssr:gopark` - Run SSR server in production mode

## Dependencies
Key dependencies include:
- @angular/core, @angular/router, @angular/forms
- @angular/ssr for server-side rendering
- @angular/fire for Firebase integration
- express for the SSR server
