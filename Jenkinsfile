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

        /* ==========================
            1. CHECKOUT CODE
        ===========================*/
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        /* ==========================
            2. CREATE ENV FILES
        ===========================*/
        stage('Setup ENV Files') {
            steps {
                withCredentials([
                    string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET'),
                    string(credentialsId: 'EMAIL_PASS', variable: 'EMAIL_PASS'),
                    string(credentialsId: 'EMAIL_USER', variable: 'EMAIL_USER'),
                    string(credentialsId: 'GEMINI_API_KEY', variable: 'GEMINI_API_KEY'),
                    string(credentialsId: 'CLOUDINARY_CLOUD_NAME', variable: 'CLOUDINARY_CLOUD_NAME'),
                    string(credentialsId: 'CLOUDINARY_API_KEY', variable: 'CLOUDINARY_API_KEY'),
                    string(credentialsId: 'CLOUDINARY_API_SECRET', variable: 'CLOUDINARY_API_SECRET'),
                    string(credentialsId: 'STRIPE_SECRET_KEY', variable: 'STRIPE_SECRET_KEY')
                ]) {

                    sh """
                    echo '>>> Creating ENV files for microservices...'

                    # ======================================
                    # API GATEWAY ENV
                    # ======================================
                    cat <<EOF > AdidasCloneBackEnd/api_gateway/.env
PORT=3000
JWT_SECRET=$JWT_SECRET
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
EOF

                    # ======================================
                    # USER SERVICE ENV
                    # ======================================
                    cat <<EOF > AdidasCloneBackEnd/service/user_service/.env
PORT=3002
JWT_SECRET=$JWT_SECRET
EOF

                    # ======================================
                    # PRODUCT SERVICE ENV
                    # ======================================
                    cat <<EOF > AdidasCloneBackEnd/service/product_service/.env
PORT=3001
GEMINI_API_KEY=$GEMINI_API_KEY
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
EOF

                    # ======================================
                    # ORDER SERVICE ENV
                    # ======================================
                    cat <<EOF > AdidasCloneBackEnd/service/order_service/.env
PORT=3003
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
EOF
                    """
                }
            }
        }

        /* ==========================
            COPY FIREBASE ADMIN KEY
        ===========================*/
        stage('Setup Firebase Key') {
            steps {
                withCredentials([
                    file(credentialsId: 'FIREBASE_ADMIN_KEY', variable: 'FIREBASE_KEY')
                ]) {
                    sh """
                    echo '>>> Copy firebase-admin-key.json for user_service'
                    cp "\$FIREBASE_KEY" AdidasCloneBackEnd/service/user_service/firebase-admin-key.json
                    """
                }
            }
        }

        /* ==========================
            3. VERIFY COMPOSE FILE
        ===========================*/
        stage('Verify Compose File') {
            steps {
                sh """
                    echo '>>> Using docker-compose.yml'
                    test -f docker-compose.yml
                    docker compose -f docker-compose.yml config > /dev/null
                """
            }
        }

        /* ==========================
            4. STOP OLD SERVICES
        ===========================*/
        stage('Stop Old Services') {
            steps {
                sh """
                    echo '--- Stopping existing services ---'
                    ${COMPOSE_CMD} down || true
                """
            }
        }

        /* ==========================
            5. BUILD BACKEND SERVICES
        ===========================*/
        stage('Build backend services') {
            steps {
                sh """
                    echo '--- Building API Gateway ---'
                    docker build -t adidas_api_gateway ./AdidasCloneBackEnd/api_gateway

                    echo '--- Building Order Service ---'
                    docker build -t order_service ./AdidasCloneBackEnd/service/order_service

                    echo '--- Building Product Service ---'
                    docker build -t product_service ./AdidasCloneBackEnd/service/product_service

                    echo '--- Building User Service ---'
                    docker build -t user_service ./AdidasCloneBackEnd/service/user_service
                """
            }
        }

        /* ==========================
            6. BUILD FRONTEND
        ===========================*/
        stage('Build frontend') {
            steps {
                sh """
                    echo '--- Building Frontend ---'
                    docker build -t adidas_frontend ./AdidasCloneFrontEnd
                """
            }
        }

        /* ==========================
            7. BUILD ADMIN PANEL
        ===========================*/
        stage('Build admin') {
            steps {
                sh """
                    echo '--- Building Admin Page ---'
                    docker build -t adidas_admin ./Admin_Template
                """
            }
        }

        /* ==========================
            8. DEPLOY SERVICES
        ===========================*/
        stage('Deploy Services') {
            steps {
                sh """
                    echo '--- Deploying services with docker-compose.yml ---'
                    ${COMPOSE_CMD} up -d --build
                """
            }
        }
    }

    /* ==========================
        POST ACTIONS
    ===========================*/
    post {
        success {
            echo "🚀 CI/CD completed successfully!"
        }

        failure {
            echo "❌ Build failed!"
        }

        always {
            echo "🧹 Cleaning unused docker resources..."
            sh "docker system prune -f || true"
        }
    }
}
