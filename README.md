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

