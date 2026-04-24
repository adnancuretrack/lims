# Use eclipse-temurin as the base image for runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install necessary libraries for JasperReports (AWT) and LibreOffice for PDF conversion
RUN apk add --no-cache \
    fontconfig \
    ttf-dejavu \
    libxrender \
    libxtst \
    libxi \
    libreoffice

# Create a non-root user for security
RUN addgroup -S lims && adduser -S lims -G lims

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads && chown -R lims:lims /app

USER lims

# Copy the JAR from the local target directory
COPY target/lims-backend-*.jar app.jar

# Expose the application port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
