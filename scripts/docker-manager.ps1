#!/usr/bin/env pwsh
# Docker management script for VN Speech Guardian
# Usage: .\docker-manager.ps1 [command] [environment]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "up", "down", "restart", "logs", "clean", "health")]
    [string]$Command,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod", "test")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Change to infra directory
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\infra"

# Define compose files based on environment
$ComposeFiles = @{
    "dev" = @("docker-compose.yml", "docker-compose.override.yml")
    "prod" = @("docker-compose.yml", "docker-compose.prod.yml") 
    "test" = @("docker-compose.yml", "docker-compose.test.yml")
}

$Files = $ComposeFiles[$Environment]
$ComposeArgs = $Files | ForEach-Object { "-f", $_ }

Write-Host "🚀 VSG Docker Manager - Environment: $Environment" -ForegroundColor Cyan

switch ($Command) {
    "build" {
        Write-Host "🔨 Building containers..." -ForegroundColor Yellow
        if ($Force) {
            docker-compose @ComposeArgs build --no-cache --pull
        } else {
            docker-compose @ComposeArgs build
        }
    }
    
    "up" {
        Write-Host "▶️ Starting services..." -ForegroundColor Green
        docker-compose @ComposeArgs up -d
        
        # Wait for health checks
        Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
        $timeout = 120
        $elapsed = 0
        do {
            Start-Sleep 5
            $elapsed += 5
            $status = docker-compose @ComposeArgs ps --format json | ConvertFrom-Json
            $unhealthy = $status | Where-Object { $_.Health -notin @("healthy", "") }
            
            if ($unhealthy.Count -eq 0) {
                Write-Host "✅ All services are healthy!" -ForegroundColor Green
                break
            }
            
            Write-Host "⏳ Waiting... ($elapsed/$timeout seconds)" -ForegroundColor Yellow
        } while ($elapsed -lt $timeout)
        
        if ($elapsed -ge $timeout) {
            Write-Host "⚠️ Timeout waiting for services to be healthy" -ForegroundColor Red
        }
    }
    
    "down" {
        Write-Host "⏹️ Stopping services..." -ForegroundColor Red
        if ($Force) {
            docker-compose @ComposeArgs down -v --remove-orphans
        } else {
            docker-compose @ComposeArgs down
        }
    }
    
    "restart" {
        Write-Host "🔄 Restarting services..." -ForegroundColor Yellow
        docker-compose @ComposeArgs restart
    }
    
    "logs" {
        Write-Host "📋 Showing logs..." -ForegroundColor Blue
        docker-compose @ComposeArgs logs -f
    }
    
    "clean" {
        Write-Host "🧹 Cleaning up..." -ForegroundColor Magenta
        # Stop and remove containers
        docker-compose @ComposeArgs down -v --remove-orphans
        
        # Remove images if force flag is used
        if ($Force) {
            Write-Host "🗑️ Removing images..." -ForegroundColor Red
            docker image rm vsg-gateway:latest -f 2>$null
            docker image rm vsg-ai-worker:latest -f 2>$null
            
            # Clean up build cache
            docker buildx prune -f
            docker system prune -f
        }
    }
    
    "health" {
        Write-Host "🏥 Checking service health..." -ForegroundColor Blue
        docker-compose @ComposeArgs ps
        Write-Host ""
        
        # Test endpoints
        $services = @{
            "Gateway" = "http://localhost:3001/health"
            "AI Worker" = "http://localhost:8001/readyz"
        }
        
        foreach ($service in $services.GetEnumerator()) {
            try {
                $response = Invoke-WebRequest -Uri $service.Value -TimeoutSec 5 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ $($service.Key): OK" -ForegroundColor Green
                } else {
                    Write-Host "❌ $($service.Key): HTTP $($response.StatusCode)" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ $($service.Key): Not reachable" -ForegroundColor Red
            }
        }
    }
}

Write-Host "✨ Operation completed!" -ForegroundColor Cyan