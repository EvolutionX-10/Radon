# 🐳 Radon Discord Bot - Docker Setup (Updated for Cloud Services)

This guide explains how to run Radon using Docker with support for both **local development** and **production deployment with cloud services**.

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your system
- A Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))
- For production: MongoDB Atlas and Redis Cloud accounts (recommended)

## 🌐 Production Setup (Cloud Services) - Recommended

**Perfect for Railway deployment or when using MongoDB Atlas + Redis Cloud:**

### 1. Environment Setup

```bash
# Copy the environment template
cp .env.example .env
```

### 2. Configure Cloud Services

Edit `.env` with your cloud service credentials:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_NAME=Radon

# MongoDB Atlas (Cloud Database)
MONGO=mongodb+srv://username:password@cluster.mongodb.net/radon?retryWrites=true&w=majority

# Redis Cloud (Cloud Cache)
REDIS_HOST=your-redis-cloud-host.com
REDIS_PORT=12345
REDIS_PASSWORD=your_redis_cloud_password

# Optional: Bot list tokens
TOP_BOT_TOKEN=your_top_gg_token
VOID_BOT_TOKEN=your_void_bots_token
```

### 3. Run Production Bot

```bash
# Build and run the bot with cloud services
docker-compose up -d

# View logs
docker-compose logs -f radon-bot

# Stop the bot
docker-compose down
```

## 🔧 Development Setup (Cloud Services)

**For development with cloud services using separate credentials:**

### 1. Development Environment Setup

```bash
# Copy the development environment template
cp .env.example .env.development
```

### 2. Configure Development Cloud Services

Edit `.env.development` with your development cloud service credentials:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_development_discord_bot_token
CLIENT_NAME=Radon-Dev

# MongoDB Atlas (Development Database)
MONGO=mongodb+srv://username:password@dev-cluster.mongodb.net/radon_dev?retryWrites=true&w=majority

# Redis Cloud (Development Cache)
REDIS_HOST=your-dev-redis-cloud-host.com
REDIS_PORT=12345
REDIS_PASSWORD=your_dev_redis_cloud_password
```

### 3. Run Development Bot

```bash
# Build and run the development bot with cloud services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f radon-bot-dev

# Stop the development bot
docker-compose -f docker-compose.dev.yml down
```

## 🚀 Railway Deployment

### Automatic Production Stage Detection

Railway will automatically use the **production stage** from our multi-stage Dockerfile since it's positioned as the last stage. No additional configuration needed!

### Optional: Explicit Railway Configuration

Create `railway.toml` for explicit control:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "./Dockerfile"

[deploy]
restartPolicyType = "on-failure"
```

### Environment Variables on Railway

Set these via Railway dashboard or CLI:

```bash
railway variables set DISCORD_TOKEN=your_token
railway variables set MONGO=your_mongodb_atlas_connection_string
railway variables set REDIS_HOST=your_redis_cloud_host
railway variables set REDIS_PASSWORD=your_redis_cloud_password
```

## 🔍 Multi-Stage Dockerfile Explanation

Our Dockerfile uses a 3-stage build:

1. **Builder Stage**: Compiles TypeScript and installs all dependencies
2. **Development Stage**: For local development with hot reload
3. **Production Stage**: Optimized final image with only runtime dependencies

**Important**: Railway and Docker use the **last stage** by default, which is our production stage.

## Services Included

### Production (`docker-compose.yml`)

- **radon-bot**: The main Discord bot using cloud services

### Development (`docker-compose.dev.yml`)

- **radon-bot-dev**: Bot with hot reloading and development configuration using cloud services

**Note**: Both environments now use cloud services (MongoDB Atlas + Redis Cloud) with different credentials.

## Management Interfaces

Both environments use cloud services:

- **Production**: Access your production databases through MongoDB Atlas and Redis Cloud dashboards
- **Development**: Access your development databases through MongoDB Atlas and Redis Cloud dashboards

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
