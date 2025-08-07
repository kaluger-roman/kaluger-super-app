# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a tutor management application with:

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Material UI + Effector + Feature Sliced Design

## Additional Frontend Guidelines

- Try avoid large React components (more than 150 lines). Split logic and UI into smaller components when possible.
- Extract shared logic and UI into reusable components or hooks.
- Move as much business and state logic as possible from React components into Effector models (store, events, effects).
- One file — one React component. Place hooks and helpers in separate files or in shared files.
- If you edit a long component, try to split it into smaller components according to guidelines.

## Coding Guidelines

- Use TypeScript types instead of interfaces when possible
- Use the latest ECMAScript features
- Use async/await for asynchronous code
- Use arrow functions for concise function expressions
- Use destructuring for cleaner code
- Use template literals for string interpolation
- Use spread operator for arrays and objects
- For React components, use functional components with hooks
- For functions use types of parameters, not type of function
- Errors from backend send in Russian language

## Architecture

- Follow Feature Sliced Design for frontend architecture
- Use Effector for state management
- Backend follows RESTful API design
- Database schema managed with Prisma migrations

## Features

The application includes:

- Schedule management
- Student management
- Lesson notes and homework tracking
- Payment tracking
- Lesson planning and rescheduling
- Pricing and grading system
