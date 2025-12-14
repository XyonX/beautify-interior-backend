pipeline {
    agent any

    stages {
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
                sh 'docker build -t beautify-backend .'
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                docker stop beautify-backend || true
                docker rm beautify-backend || true

                docker run -d \
                  --name beautify-backend \
                  --env-file .env \
                  -p 4001:4001 \
                  beautify-backend
                '''
            }
        }
    }
}
