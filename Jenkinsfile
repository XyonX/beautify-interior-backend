pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/XyonX/beautify-interior-backend.git'
            }
        }

        stage('Prepare Env') {
            steps {
                withCredentials([file(credentialsId: 'BEAUTIFY_BACKEND_ENV', variable: 'ENV_FILE')]) {
                    sh '''
                    cp $ENV_FILE .env
                    '''
                }
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                docker build -t beautify-backend .
                '''
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh '''
                docker compose down || true
                docker compose up -d
                '''
            }
        }
    }
}
