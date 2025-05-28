# Radon Discord Bot Docker Management Script for Windows PowerShell

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "dev", "stop", "restart", "logs", "build", "clean", "status", "shell", "db", "help")]
    [string]$Command = "help",
    
    [switch]$Follow,
    [switch]$Detach = $true,
    [switch]$Build
)

# Function to print colored output
function Write-ColorMessage {
    param(
        [string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to check if .env file exists
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-ColorMessage "⚠️  .env file not found!" Yellow
        Write-ColorMessage "Creating .env file from template..." Blue
        Copy-Item ".env.example" ".env"
        Write-ColorMessage "📝 Please edit .env file with your Discord bot token and other configurations!" Red
        Write-ColorMessage "💡 At minimum, set DISCORD_TOKEN in the .env file" Yellow
        exit 1
    }
}

# Function to display usage
function Show-Usage {
    @"
Radon Discord Bot Docker Management

Usage: .\docker-manage.ps1 [COMMAND] [OPTIONS]

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
    -Follow         Follow logs (for logs command)
    -Build          Force rebuild when starting

Examples:
    .\docker-manage.ps1 start           # Start in production mode
    .\docker-manage.ps1 dev             # Start in development mode
    .\docker-manage.ps1 logs -Follow    # Follow logs
    .\docker-manage.ps1 restart -Build  # Restart with rebuild
    .\docker-manage.ps1 clean           # Clean up everything

"@
}

# Set compose file based on command
if ($Command -eq "dev") {
    $ComposeFile = "docker-compose.dev.yml"
    $ServiceName = "radon-bot-dev"
} else {
    $ComposeFile = "docker-compose.yml"
    $ServiceName = "radon-bot"
}

# Main command execution
switch ($Command) {
    "start" {
        Test-EnvFile
        Write-ColorMessage "🚀 Starting Radon Discord Bot in production mode..." Green
        
        $buildArg = if ($Build) { "--build" } else { "" }
        
        if ($Build) {
            docker-compose -f $ComposeFile up -d --build
        } else {
            docker-compose -f $ComposeFile up -d
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "✅ Bot started successfully!" Green
            Write-ColorMessage "📋 Use '.\docker-manage.ps1 logs' to view logs" Blue
        } else {
            Write-ColorMessage "❌ Failed to start bot" Red
            exit 1
        }
    }
      "dev" {
        Test-EnvFile
        Write-ColorMessage "🛠️  Starting Radon Discord Bot in development mode..." Green
        Write-ColorMessage "☁️  Using cloud services (MongoDB Atlas + Redis Cloud) with development credentials" Blue
        
        if ($Build) {
            docker-compose -f $ComposeFile up -d --build
        } else {
            docker-compose -f $ComposeFile up -d
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "✅ Development environment started!" Green
            Write-ColorMessage "🌐 Bot accessible on port 3001" Blue
            Write-ColorMessage "📋 Use '.\docker-manage.ps1 logs' to view logs" Blue
        } else {
            Write-ColorMessage "❌ Failed to start development environment" Red
            exit 1
        }
    }
    
    "stop" {
        Write-ColorMessage "🛑 Stopping all services..." Yellow
        docker-compose -f docker-compose.yml down
        docker-compose -f docker-compose.dev.yml down
        Write-ColorMessage "✅ All services stopped" Green
    }
    
    "restart" {
        Write-ColorMessage "🔄 Restarting services..." Yellow
        
        docker-compose -f $ComposeFile down
        
        if ($Build) {
            docker-compose -f $ComposeFile up -d --build
        } else {
            docker-compose -f $ComposeFile up -d
        }
        
        Write-ColorMessage "✅ Services restarted!" Green
    }
    
    "logs" {
        if ($Follow) {
            docker-compose -f $ComposeFile logs -f $ServiceName
        } else {
            docker-compose -f $ComposeFile logs $ServiceName
        }
    }
    
    "build" {
        Write-ColorMessage "🔨 Building Docker image..." Blue
        docker-compose -f $ComposeFile build --no-cache
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "✅ Build completed!" Green
        } else {
            Write-ColorMessage "❌ Build failed" Red
            exit 1
        }
    }
    
    "clean" {
        Write-ColorMessage "🧹 Cleaning up Docker resources..." Yellow
        docker-compose -f docker-compose.yml down -v
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        Write-ColorMessage "✅ Cleanup completed!" Green
    }
    
    "status" {
        Write-ColorMessage "📊 Service Status:" Blue
        Write-ColorMessage "`nProduction Services:" Cyan
        docker-compose -f docker-compose.yml ps
        Write-ColorMessage "`nDevelopment Services:" Cyan
        docker-compose -f docker-compose.dev.yml ps
    }
    
    "shell" {
        Write-ColorMessage "🐚 Accessing bot container shell..." Blue
        
        $serviceStatus = docker-compose -f $ComposeFile ps $ServiceName
        if ($serviceStatus -match "Up") {
            docker-compose -f $ComposeFile exec $ServiceName sh
        } else {
            Write-ColorMessage "❌ Service $ServiceName is not running" Red
            exit 1
        }
    }
      "db" {
        Write-ColorMessage "🗄️  Cloud Database Services:" Blue
        Write-ColorMessage "Production: Uses .env file credentials" Green
        Write-ColorMessage "Development: Uses .env.development file credentials" Green
        Write-ColorMessage "💡 Both environments now use cloud services (MongoDB Atlas + Redis Cloud)" Yellow
        Write-ColorMessage "🌐 Access your databases through their respective cloud dashboards" Blue
    }
    
    "help" {
        Show-Usage
    }
    
    default {
        Write-ColorMessage "Unknown command: $Command" Red
        Show-Usage
        exit 1
    }
}
