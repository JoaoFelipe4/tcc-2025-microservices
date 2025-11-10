#!/bin/bash

# Medical Microservices - Deploy Helper Script
# Este script facilita o build, push e deploy dos microsserviços

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID}"
ECS_CLUSTER="medical-microservices-cluster"

# Service names
SERVICES=("auth-service" "doctors-service" "patients-service")

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed"
        exit 1
    fi
    print_success "Docker found"

    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed"
        exit 1
    fi
    print_success "AWS CLI found"

    if [ -z "$AWS_ACCOUNT_ID" ]; then
        print_error "AWS_ACCOUNT_ID not set"
        echo "Run: export AWS_ACCOUNT_ID=<your-account-id>"
        exit 1
    fi
    print_success "AWS Account ID: $AWS_ACCOUNT_ID"
}

ecr_login() {
    print_header "Logging into ECR"
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin \
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    print_success "ECR login successful"
}

build_service() {
    local service=$1
    print_header "Building $service"

    cd $service
    docker build -t medical-$service:latest .
    docker tag medical-$service:latest \
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/medical-$service:latest
    cd ..

    print_success "$service built successfully"
}

push_service() {
    local service=$1
    print_header "Pushing $service to ECR"

    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/medical-$service:latest

    print_success "$service pushed to ECR"
}

deploy_service() {
    local service=$1
    print_header "Deploying $service to ECS"

    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $service \
        --force-new-deployment \
        --region $AWS_REGION > /dev/null

    print_success "$service deployment triggered"
}

local_start() {
    print_header "Starting services locally with Docker Compose"

    docker-compose up -d

    echo ""
    print_success "Services started!"
    echo ""
    echo "Access services at:"
    echo "  - Auth Service:     http://localhost:3001"
    echo "  - Doctors Service:  http://localhost:3002"
    echo "  - Patients Service: http://localhost:3003"
    echo ""
    echo "View logs: docker-compose logs -f"
}

local_stop() {
    print_header "Stopping local services"
    docker-compose down
    print_success "Services stopped"
}

local_logs() {
    docker-compose logs -f $1
}

show_status() {
    print_header "ECS Services Status"

    for service in "${SERVICES[@]}"; do
        echo ""
        echo "Service: $service"
        aws ecs describe-services \
            --cluster $ECS_CLUSTER \
            --services $service \
            --region $AWS_REGION \
            --query 'services[0].[desiredCount,runningCount,status]' \
            --output table
    done
}

create_ecr_repos() {
    print_header "Creating ECR Repositories"

    for service in "${SERVICES[@]}"; do
        print_info "Creating repository for medical-$service"
        aws ecr create-repository \
            --repository-name medical-$service \
            --region $AWS_REGION 2>/dev/null || print_info "Repository already exists"
    done

    print_success "ECR repositories ready"
}

setup_secrets() {
    print_header "Setting up AWS Secrets Manager"

    print_info "Creating secrets..."

    # JWT Secret
    aws secretsmanager create-secret \
        --name medical/jwt-secret \
        --secret-string "$(openssl rand -base64 32)" \
        --region $AWS_REGION 2>/dev/null || print_info "jwt-secret already exists"

    # JWT Expire
    aws secretsmanager create-secret \
        --name medical/jwt-expire \
        --secret-string "7d" \
        --region $AWS_REGION 2>/dev/null || print_info "jwt-expire already exists"

    print_success "Secrets configured"
    print_info "Don't forget to configure MongoDB URI secrets manually!"
}

run_tests() {
    print_header "Running Tests"

    for service in "${SERVICES[@]}"; do
        print_info "Testing $service"
        cd $service
        npm install
        npm test || print_error "$service tests failed"
        cd ..
    done

    print_success "All tests completed"
}

show_help() {
    cat << EOF
Medical Microservices Deployment Helper

Usage: ./deploy-helper.sh [command]

Commands:
  local-start          Start all services locally with Docker Compose
  local-stop           Stop all local services
  local-logs [service] View logs (optionally for specific service)

  build [service]      Build Docker image (or all if not specified)
  push [service]       Push to ECR (or all if not specified)
  deploy [service]     Deploy to ECS (or all if not specified)

  full-deploy          Build, push, and deploy all services

  create-repos         Create ECR repositories
  setup-secrets        Create AWS Secrets Manager entries
  status               Show ECS services status
  test                 Run tests for all services

  help                 Show this help message

Examples:
  ./deploy-helper.sh local-start
  ./deploy-helper.sh build auth-service
  ./deploy-helper.sh full-deploy
  ./deploy-helper.sh status

Environment Variables:
  AWS_ACCOUNT_ID       Your AWS Account ID (required)
  AWS_REGION           AWS Region (default: us-east-1)

EOF
}

# Main script logic
case "$1" in
    local-start)
        local_start
        ;;
    local-stop)
        local_stop
        ;;
    local-logs)
        local_logs $2
        ;;
    build)
        check_prerequisites
        if [ -z "$2" ]; then
            for service in "${SERVICES[@]}"; do
                build_service $service
            done
        else
            build_service $2
        fi
        ;;
    push)
        check_prerequisites
        ecr_login
        if [ -z "$2" ]; then
            for service in "${SERVICES[@]}"; do
                push_service $service
            done
        else
            push_service $2
        fi
        ;;
    deploy)
        check_prerequisites
        if [ -z "$2" ]; then
            for service in "${SERVICES[@]}"; do
                deploy_service $service
            done
        else
            deploy_service $2
        fi
        ;;
    full-deploy)
        check_prerequisites
        ecr_login
        for service in "${SERVICES[@]}"; do
            build_service $service
            push_service $service
            deploy_service $service
        done
        print_success "Full deployment completed!"
        ;;
    create-repos)
        check_prerequisites
        create_ecr_repos
        ;;
    setup-secrets)
        check_prerequisites
        setup_secrets
        ;;
    status)
        check_prerequisites
        show_status
        ;;
    test)
        run_tests
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
