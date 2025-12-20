


// pipeline{

//     agent any;      // WHERE it runs

//     environment{
//         key="value"
//     }

//     stages{         // a pipeline contians only a single stages block with mltiple stage block in it 
        
//         /*
//             01 Checkout

//             02 Build

//             Test * skip for now 

//             03 Deploy

//             Security Scan

//             this 5 stage are standerd
//         */
//         stage{          //01 checkout
//             steps{
//                 git 'https://github.com/XyonX/beautify-interior-backend.git'
//             }
//         }

//         stage{          // 0101prepare env

//         }

//         stage{          //02 build
//             steps{
//                 sh "docker build -t beautify-backend ."
//             }
        
//         }

//         stage{          //03 deploy
//             steps{
//                 sh "docker compose up -d"
//             }
//         }




//     }

// }

pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/XyonX/beautify-interior-backend.git'
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                docker build -t beautify-backend .
                '''
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    file(credentialsId: 'BEAUTIFY_BACKEND_ENV', variable: 'ENV_FILE')
                ]) {
                    sh '''
                        docker compose --env-file $ENV_FILE down
                        docker compose --env-file $ENV_FILE up -d --build
                    '''
                }
            }
        }

    }
}
