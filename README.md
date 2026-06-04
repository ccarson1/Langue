# Langue
Cross Platform Language Learning Application 

# Install expo
npm install expo


# Build web from phone
npx expo export --platform web

# Run web app
cd dist
python -m http.server 8080



# Run Django
# Needs to be run with 0.0.0.0:8000 to be accessible to other devices on the network
python manage.py runserver 0.0.0.0:8000

# Run frontend React
npm run dev

# Run Expo
npx expo start

# To sync all branches and tags:
git fetch --all

# To update your local branch with remote changes and rebase your changes on top (safer in teams):
git pull --rebase origin main

# Or, if you prefer merging:
git pull origin main


# IF 
# error: cannot pull with rebase: You have unstaged changes.
# error: Please commit or stash them.

git reset --hard
git pull --rebase origin main


# Building the .apk file
1. The project must be at the top level of the C: drive 
2. "npm install" will need to be run within mobile-app to generate the node_modules

# Use Docker compose
docker-compose build
docker-compose up -d



# Mail server test
# Run this using docker to receive test emails
docker run -p 8025:8025 -p 1025:1025 mailhog/mailhog

