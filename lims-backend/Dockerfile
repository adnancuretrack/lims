# Stage 1: Build the application
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install necessary libraries for JasperReports (AWT)
RUN apk add --no-cache \
    fontconfig \
    ttf-dejavu \
    libxrender \
    libxtst \
    libxi

# Create a non-root user for security
RUN addgroup -S lims && adduser -S lims -G lims

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads && chown -R lims:lims /app

USER lims

# Copy the JAR from the build stage
COPY --from=build /app/target/lims-backend-*.jar app.jar

# Expose the application port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
