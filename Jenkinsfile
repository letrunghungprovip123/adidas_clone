pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    tools {
        nodejs "node20"
        git "git"
    }

    environment {
        COMPOSE_CMD = "docker compose -f docker-compose.yml"
    }

    stages {

        stage('Clone repository') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/letrunghungprovip123/adidas_clone.git'
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

        stage('Deploy with Docker Compose') {
            steps {
                sh """
                    echo "--- Restarting Services ---"
                    ${COMPOSE_CMD} up -d --build
                """
            }
        }
    }

    post {
        success {
            echo "🚀 CI/CD completed successfully!"
        }
        failure {
            echo "❌ Build failed!"
        }
        always {
            echo "Cleaning temp docker containers..."
            sh "docker system prune -f || true"
        }
    }
}
