pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    tools {
        nodejs "node20"
    }

    environment {
        COMPOSE_CMD = "docker compose -f docker-compose.yml"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Verify Compose File') {
            steps {
                sh """
                    echo '>>> Using docker-compose.yml'
                    test -f docker-compose.yml
                    docker compose -f docker-compose.yml config > /dev/null
                """
            }
        }

        stage('Stop Old Services') {
            steps {
                sh """
                    echo "--- Stopping existing services ---"
                    ${COMPOSE_CMD} down || true
                """
            }
        }

        stage('Build backend services') {
            steps {
                sh """
                    echo "--- Building API Gateway ---"
                    docker build -t adidas_api_gateway ./AdidasCloneBackEnd/api_gateway

                    echo "--- Building Order Service ---"
                    docker build -t order_service ./AdidasCloneBackEnd/service/order_service

                    echo "--- Building Product Service ---"
                    docker build -t product_service ./AdidasCloneBackEnd/service/product_service

                    echo "--- Building User Service ---"
                    docker build -t user_service ./AdidasCloneBackEnd/service/user_service
                """
            }
        }

        stage('Build frontend') {
            steps {
                sh """
                    echo "--- Building Frontend ---"
                    docker build -t adidas_frontend ./AdidasCloneFrontEnd
                """
            }
        }

        stage('Build admin') {
            steps {
                sh """
                    echo "--- Building Admin Page ---"
                    docker build -t adidas_admin ./Admin_Template
                """
            }
        }

        stage('Deploy Services') {
            steps {
                sh """
                    echo "--- Deploying services with docker-compose.yml ---"
                    ${COMPOSE_CMD} up -d --build
                """
            }
        }
    }

    post {
        success { echo "🚀 CI/CD completed successfully!" }
        failure { echo "❌ Build failed!" }
        always {
            echo "🧹 Cleaning unused docker resources..."
            sh "docker system prune -f || true"
        }
    }
}
