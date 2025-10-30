# Multi-stage Dockerfile for Spring Boot app

# ---------- Build stage ----------
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy Maven wrapper and pom first to leverage Docker layer cache
COPY .mvn/ .mvn/
COPY mvnw mvnw.cmd pom.xml ./

# Go offline to cache dependencies
RUN ./mvnw -q -DskipTests dependency:go-offline

# Copy sources and build
COPY src ./src
RUN ./mvnw -q -DskipTests package

# ---------- Runtime stage ----------
FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

# App jar name from pom: BusaoRJ-0.0.1-SNAPSHOT.jar
COPY --from=build /app/target/BusaoRJ-0.0.1-SNAPSHOT.jar /app/app.jar

# Render will set $PORT; application.properties already uses server.port=${PORT:8080}
ENV JAVA_OPTS=""
EXPOSE 8080

# Use sh -c so JAVA_OPTS can be expanded
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
