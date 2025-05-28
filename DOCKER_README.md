# Radon Discord Bot - Docker Setup

This guide will help you set up and run the Radon Discord bot using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your system
- A Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))

## Quick Start

### 1. Clone and Setup Environment

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd Radon

# Copy the environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file and add your Discord bot token and other required configurations:

```env
# Required: Your Discord bot token
DISCORD_TOKEN=your_discord_bot_token_here

# Optional: Development bot token (if you have a separate dev bot)
DEV_DISCORD_TOKEN=your_development_discord_bot_token_here

# Database and Redis passwords (change these for production!)
MONGO_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_secure_redis_password_here
```

### 3. Run the Bot

#### Production Mode

```bash
# Start all services (bot, MongoDB, Redis)
docker-compose up -d

# View logs
docker-compose logs -f radon-bot

# Stop all services
docker-compose down
```

#### Development Mode

```bash
# Start development services with hot reloading
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f radon-bot-dev

# Stop development services
docker-compose -f docker-compose.dev.yml down
```

## Services Included

### Production (`docker-compose.yml`)

- **radon-bot**: The main Discord bot
- **mongodb**: MongoDB database for persistent data
- **redis**: Redis for caching and job queues
- **mongo-express**: Web UI for MongoDB management (optional, use `--profile development`)
- **redis-commander**: Web UI for Redis management (optional, use `--profile development`)

### Development (`docker-compose.dev.yml`)

- **radon-bot-dev**: Bot with hot reloading and development configuration
- **mongodb-dev**: Separate MongoDB instance for development
- **redis-dev**: Separate Redis instance for development
- **mongo-express-dev**: MongoDB management UI
- **redis-commander-dev**: Redis management UI

## Management Interfaces

When running in development mode, you can access:

- **MongoDB Express**: http://localhost:8081 (admin/admin)
- **Redis Commander**: http://localhost:8082

## Docker Commands

### Building and Running

```bash
# Build the Docker image
docker build -t radon-bot .

# Run just the bot (requires external MongoDB and Redis)
docker run -d --name radon-bot --env-file .env radon-bot

# Rebuild and restart services
docker-compose up --build -d
```

### Maintenance

```bash
# View bot logs
docker-compose logs -f radon-bot

# Execute commands inside the bot container
docker-compose exec radon-bot bun run typecheck

# Access bot container shell
docker-compose exec radon-bot sh

# Update Prisma client
docker-compose exec radon-bot bunx prisma generate

# Reset database (development only)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Scaling

```bash
# Scale the bot (if you need multiple instances)
docker-compose up -d --scale radon-bot=3
```

## Environment Variables

| Variable            | Required | Description                                            |
| ------------------- | -------- | ------------------------------------------------------ |
| `DISCORD_TOKEN`     | Yes      | Your Discord bot token                                 |
| `DEV_DISCORD_TOKEN` | No       | Development bot token                                  |
| `MONGO`             | No       | MongoDB connection string (auto-configured for Docker) |
| `DEV_MONGO`         | No       | Development MongoDB connection string                  |
| `REDIS_HOST`        | No       | Redis host (auto-configured for Docker)                |
| `REDIS_PORT`        | No       | Redis port (default: 6379)                             |
| `REDIS_PASSWORD`    | No       | Redis password                                         |
| `CLIENT_NAME`       | No       | Bot client name (default: Radon)                       |
| `TOP_BOT_TOKEN`     | No       | Top.gg API token for bot statistics                    |
| `VOID_BOT_TOKEN`    | No       | Void Bots API token for bot statistics                 |

## Data Persistence

Docker volumes are used to persist data:

- `mongodb-data`: MongoDB database files
- `redis-data`: Redis data files
- `./logs`: Application logs (mounted from host)

## Troubleshooting

### Bot won't start

1. Check that your Discord token is correct
2. Verify environment variables in `.env` file
3. Check container logs: `docker-compose logs radon-bot`

### Database connection issues

1. Ensure MongoDB container is running: `docker-compose ps`
2. Check MongoDB logs: `docker-compose logs mongodb`
3. Verify database connection string in environment variables

### Redis connection issues

1. Ensure Redis container is running: `docker-compose ps`
2. Check Redis logs: `docker-compose logs redis`
3. Verify Redis configuration in environment variables

### Permission issues

1. Ensure the bot has proper Discord permissions
2. Check that the bot is added to your Discord server
3. Verify bot token is not expired

## Security Notes

- Change default passwords in production
- Use Docker secrets for sensitive data in production
- Regularly update the base Docker images
- Monitor container resource usage

## Support

For additional help:

1. Check the application logs
2. Review Discord.js documentation
3. Join the support Discord server (if available)
4. Open an issue on the GitHub repository
