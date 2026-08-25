# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S inko && adduser -S inko -G inko
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Writable upload root for the non-runtime user (INKO_STORAGE_ROOT=./data/storage)
RUN mkdir -p /app/data/storage && chown -R inko:inko /app
USER inko

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
