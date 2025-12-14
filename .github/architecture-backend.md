# Architecture Guide Backend

This guide covers the architectural decisions and patterns used in the backend part of the project.

## Structure

This section describes the `backend/` directory structure and the main conventions used by the codebase.

Top-level layout (important folders/files):

```
backend/
├─ prisma/                # Prisma ORM schema and migrations
│  ├─ schema.prisma       # Database schema definition
│  └─ migrations/         # Database migration history
├─ src/                   # application source code (TypeScript + Express)
│  ├─ index.ts            # app bootstrap, server setup, middleware, cron jobs
│  ├─ controllers/        # request handlers grouped by feature
│  ├─ routes/             # Express route definitions
│  ├─ middleware/         # Express middleware (auth, error handling)
│  ├─ services/           # Business logic services
│  ├─ lib/                # Third-party integrations and utilities
│  ├─ utils/              # Utility functions
│  └─ types/              # TypeScript type definitions
```

## Architecture Principles

### Layered Architecture

The backend follows a layered architecture pattern:

1. **Routes Layer** (`routes/`): Defines HTTP endpoints and applies middleware
2. **Controllers Layer** (`controllers/`): Handles HTTP requests/responses, input validation
3. **Services Layer** (`services/`): Contains business logic and complex operations
4. **Data Layer** (Prisma): Database access through Prisma ORM

**Flow:** `Routes → Controllers → Services → Prisma → Database`

### Separation of Concerns

- **Controllers**: Handle HTTP concerns only (request parsing, response formatting, status codes)
- **Services**: Implement business logic (recurring lessons, status updates, complex calculations)
- **Utils**: Pure functions for common operations (time formatting, validation)
- **Middleware**: Cross-cutting concerns (authentication, error handling, logging)

Each domain has:

- Route definitions (`routes/[domain].ts`)
- Controller actions (`controllers/[domain]/`)
- Validation logic (`controllers/[domain]/validators.ts`)

## Key Components

### Entry Point (`src/index.ts`)

The main entry point sets up:

- Express application with middleware (helmet, cors, morgan, body-parser)
- Route registration for all domains
- HTTP server creation
- WebSocket server initialization
- Cron jobs for background tasks:
  - Recurring lessons processing (daily at 2 AM)
  - Lesson status updates (every minute)
- Graceful shutdown handling

### Database Layer (Prisma)

**Schema Definition** (`prisma/schema.prisma`):

- Defines database models: User, Student, Lesson
- Relationships between entities
- Field types, constraints, indexes
- Enum types for contactMethod, subject, lessonType, status

**Migrations** (`prisma/migrations/`):

- Version-controlled database schema changes
- Applied automatically in development
- Must be deployed to production

**Prisma Client** (`src/lib/prisma.ts`):

- Singleton instance of Prisma Client
- Used directly in controllers for CRUD operations
- Type-safe database queries

### Authentication & Authorization

**JWT-based authentication**:

1. User logs in with email/password (`controllers/auth.ts`)
2. Server generates JWT token with userId and email
3. Client stores token and sends it in `Authorization: Bearer <token>` header
4. Middleware (`middleware/auth.ts`) validates token on protected routes
5. `req.user` contains decoded JWT payload for authorized requests

**Authorization**:

- All data is scoped to authenticated user (tutor)
- Queries filter by `tutorId` field
- Students and lessons belong to specific tutor

### WebSocket Integration

**Implementation**:

- WebSocket server runs alongside HTTP server
- `WebSocketManager` class manages connections
- Broadcasts lesson status changes to connected clients
- Used in lesson controllers after status updates

**Usage**:

```typescript
const wsManager = getWebSocketManager();
if (wsManager) {
  wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
}
```

## Best Practices

### Controller Patterns

- Keep controllers thin (under 100 lines)
- Extract complex logic to services
- Use separate files for complex actions (50+ lines)
- Always wrap in try-catch
- Return early for error cases

### Service Patterns

- Services contain pure business logic
- Return data or throw errors
- Reusable across controllers
- Testable in isolation

### Validation Patterns

- Create `validators.ts` in controller directories
- Return array of error messages
- Check first error in controller
- Use type guards for runtime type checking

### Transaction Patterns

Use Prisma transactions for operations that must succeed or fail together:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.lesson.create({ data: lessonData });
  await tx.student.update({ where: { id }, data: { updatedAt: new Date() } });
});
```

### Time Handling

- Always use `truncateToMinute()` utility for lesson times
- Store times in UTC in database
- Convert to user timezone in frontend
- Use Date objects, not string manipulation

## Development Workflow

### Running the Server

```bash
cd backend
npm run dev  # Development with nodemon
npm run build  # TypeScript compilation
npm start  # Production mode
```

### Database Operations

```bash
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run migrations in development
npm run db:push      # Push schema changes without migration
npm run db:studio    # Open Prisma Studio GUI
```

### Adding New Features

1. **Define types** in `src/types/index.ts`
2. **Create controller** in `src/controllers/[feature]/`
3. **Add validation** in `src/controllers/[feature]/validators.ts`
4. **Define routes** in `src/routes/[feature].ts`
5. **Register routes** in `src/index.ts`
6. **Add service** if complex business logic needed
7. **Update Prisma schema** if new database entities needed

## Security Considerations

- All routes except `/api/auth/login` and `/api/auth/register` require authentication
- JWT tokens expire (configure in `utils/auth.ts`)
- Passwords hashed with bcryptjs before storage
- Helmet middleware for HTTP security headers
- CORS configured for specific frontend origin
- Input validation on all endpoints
- SQL injection prevented by Prisma (parameterized queries)
- Data scoped to authenticated user (tutorId filter)

## Performance Considerations

- Database queries include only necessary relations (`include`)
- Cron jobs run at off-peak hours (2 AM for heavy operations)
- WebSocket for real-time updates instead of polling
- Prisma connection pooling configured via DATABASE_URL
- Indexes on foreign keys and frequently queried fields

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [node-cron Documentation](https://github.com/node-cron/node-cron)
