#!/bin/bash

# Radon Discord Bot Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_message "⚠️  .env file not found!" $YELLOW
        print_message "Creating .env file from template..." $BLUE
        cp .env.example .env
        print_message "📝 Please edit .env file with your Discord bot token and other configurations!" $RED
        print_message "💡 At minimum, set DISCORD_TOKEN in the .env file" $YELLOW
        exit 1
    fi
}

# Function to display usage
usage() {
    cat << EOF
Radon Discord Bot Docker Management

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    start           Start the bot in production mode
    dev             Start the bot in development mode  
    stop            Stop all services
    restart         Restart all services
    logs            Show bot logs
    build           Build the Docker image
    clean           Clean up Docker resources
    status          Show service status
    shell           Access bot container shell
    db              Access database management interfaces
    help            Show this help message

Options:
    -f, --follow    Follow logs (for logs command)
    -d, --detach    Run in detached mode
    --build         Force rebuild when starting

Examples:
    $0 start                # Start in production mode
    $0 dev                  # Start in development mode
    $0 logs -f              # Follow logs
    $0 restart --build      # Restart with rebuild
    $0 clean                # Clean up everything

EOF
}

# Parse command line arguments
COMMAND=""
FOLLOW_LOGS=false
DETACH=true
FORCE_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        start|dev|stop|restart|logs|build|clean|status|shell|db|help)
            COMMAND="$1"
            shift
            ;;
        -f|--follow)
            FOLLOW_LOGS=true
            shift
            ;;
        -d|--detach)
            DETACH=true
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        *)
            print_message "Unknown option: $1" $RED
            usage
            exit 1
            ;;
    esac
done

# Set compose file based on command
if [ "$COMMAND" == "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    SERVICE_NAME="radon-bot-dev"
else
    COMPOSE_FILE="docker-compose.yml"
    SERVICE_NAME="radon-bot"
fi

# Main command execution
case $COMMAND in
    start)
        check_env_file
        print_message "🚀 Starting Radon Discord Bot in production mode..." $GREEN
        
        BUILD_ARG=""
        if [ "$FORCE_BUILD" == true ]; then
            BUILD_ARG="--build"
        fi
        
        docker-compose -f $COMPOSE_FILE up -d $BUILD_ARG
        print_message "✅ Bot started successfully!" $GREEN
        print_message "📋 Use '$0 logs' to view logs" $BLUE
        ;;
        
    dev)
        check_env_file
        print_message "🛠️  Starting Radon Discord Bot in development mode..." $GREEN
        
        BUILD_ARG=""
        if [ "$FORCE_BUILD" == true ]; then
            BUILD_ARG="--build"
        fi
        
        docker-compose -f $COMPOSE_FILE up -d $BUILD_ARG
        print_message "✅ Development environment started!" $GREEN
        print_message "🌐 MongoDB Express: http://localhost:8081" $BLUE
        print_message "🔧 Redis Commander: http://localhost:8082" $BLUE
        print_message "📋 Use '$0 logs' to view logs" $BLUE
        ;;
        
    stop)
        print_message "🛑 Stopping all services..." $YELLOW
        docker-compose -f docker-compose.yml down
        docker-compose -f docker-compose.dev.yml down
        print_message "✅ All services stopped" $GREEN
        ;;
        
    restart)
        print_message "🔄 Restarting services..." $YELLOW
        
        BUILD_ARG=""
        if [ "$FORCE_BUILD" == true ]; then
            BUILD_ARG="--build"
        fi
        
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d $BUILD_ARG
        print_message "✅ Services restarted!" $GREEN
        ;;
        
    logs)
        if [ "$FOLLOW_LOGS" == true ]; then
            docker-compose -f $COMPOSE_FILE logs -f $SERVICE_NAME
        else
            docker-compose -f $COMPOSE_FILE logs $SERVICE_NAME
        fi
        ;;
        
    build)
        print_message "🔨 Building Docker image..." $BLUE
        docker-compose -f $COMPOSE_FILE build --no-cache
        print_message "✅ Build completed!" $GREEN
        ;;
        
    clean)
        print_message "🧹 Cleaning up Docker resources..." $YELLOW
        docker-compose -f docker-compose.yml down -v
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        print_message "✅ Cleanup completed!" $GREEN
        ;;
        
    status)
        print_message "📊 Service Status:" $BLUE
        docker-compose -f docker-compose.yml ps
        docker-compose -f docker-compose.dev.yml ps
        ;;
        
    shell)
        print_message "🐚 Accessing bot container shell..." $BLUE
        if docker-compose -f $COMPOSE_FILE ps $SERVICE_NAME | grep -q "Up"; then
            docker-compose -f $COMPOSE_FILE exec $SERVICE_NAME sh
        else
            print_message "❌ Service $SERVICE_NAME is not running" $RED
            exit 1
        fi
        ;;
        
    db)
        print_message "🗄️  Database Management Interfaces:" $BLUE
        print_message "MongoDB Express: http://localhost:8081 (admin/admin)" $GREEN
        print_message "Redis Commander: http://localhost:8082" $GREEN
        print_message "💡 These are only available in development mode" $YELLOW
        ;;
        
    help|"")
        usage
        ;;
        
    *)
        print_message "Unknown command: $COMMAND" $RED
        usage
        exit 1
        ;;
esac
