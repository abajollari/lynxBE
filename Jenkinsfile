
pipeline {
   agent any

   stages {
      stage('Verify Branch') {
         steps {
            echo "$GIT_BRANCH"
         }
      }

      // stage('Add .env file') {
      //    steps {
      //       sh'echo "NODE_ENV=production" >> .env'
      //       sh'echo "DATABASE_HOST=no8cmdgagn.database.windows.net" >> .env'
      //       sh'echo "DATABASE_PORT=1433" >> .env'
      //       sh'echo "DATABASE_USERNAME=abajollari" >> .env'
      //       sh'echo "DATABASE_PASSWORD=ryan@1111" >> .env'
      //       sh'echo "DATABASE_DB=lynxdb" >> .env'
      //       sh'echo "PORT=3000" >> .env'
      //       sh'echo "JWT_SECRET=mysecret" >> .env'
      //       sh'echo "REFRESH_JWT_SECRET=mysecretref" >> .env'
      //       sh'echo "JWT_EMAIL=abajollari@lynxdigital.org" >> .env'
      //       sh'echo "EMAIL_ADDRESS=abajollar@lynxdigital.org" >> .env'
      //       sh'echo "EMAIL_PASSWORD=Lryan" >> .env'
      //    }
      // }
      
      stage('Deploy to Az container registry') {
         environment {
            ENVIRONMENT = 'develop'
         }

         steps {
            echo "Deploying to ${ENVIRONMENT}"
            acrQuickTask azureCredentialsId: 'lynxServicePricipal', 
                        gitPath: '', 
                        gitRefspec: '', 
                        gitRepo: '', 
                        imageNames: [[image: 'lynxdigitalauth:latest']], 
                        registryName: 'lynxUIRegistry', 
                        resourceGroupName: 'Resource_Group_Linux', 
                        tarball: '', 
                        variant: ''  
         }
      }
      stage('Restart app service') {
         steps {
            azureCLI commands: [[exportVariablesString: '', script: 'az webapp restart --name LynxAuth --resource-group Resource_Group_Linux']], principalCredentialId: 'lynxServicePricipal'
         }
      }
      stage('End Stage') {
         steps {
            echo "DONE..."
         }
      }
   }
}