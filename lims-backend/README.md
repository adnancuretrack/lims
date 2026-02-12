# LIMS Backend

## Build & Run

```bash
# Build
mvn clean package -DskipTests

# Run (dev profile)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run (production profile)
java -jar target/lims-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=prod
```

## API Documentation

Once running, Swagger UI is available at:
- http://localhost:8080/swagger-ui.html

OpenAPI JSON spec (for frontend codegen):
- http://localhost:8080/api-docs

## Prerequisites

- Java 21
- PostgreSQL 16 (or use H2 in dev profile)
- Redis (optional in dev)
- RabbitMQ (optional in dev)

## Profiles

| Profile | Purpose |
|---------|---------|
| `dev`   | Local development — verbose logging, optional H2, RabbitMQ/Redis disabled |
| `prod`  | Production — env vars for secrets, Swagger disabled, minimal logging |
