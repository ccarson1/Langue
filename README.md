# Langue
Cross Platform Language Learning Application 

# Install expo
npm install expo


# Build web from phone
npx expo export --platform web

# Run web app
cd dist
python -m http.server 8080


# Create django superuser
python manage.py migrate
python manage.py createsuperuser


# Populate database
Add Languages

# Manually create profile for superuser

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

http://localhost:8025/

# Local Build on windows
navigate to  C:\dev\Langue\mobile-frontend\mobile-app>
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install

cd android

./gradlew clean
./gradlew assembleDebug
./gradlew assembleRelease 

cd android
npx expo prebuild --clean
npx expo run:android

app/build/outputs/apk/release/app-release.apk





# TV Channels

// const CHANNELS = [
//   {
//     id: '1',
//     name: 'Radijas',
//     url: 'https://stream-live.lrt.lt/radijas/stream03/streamPlaylist.m3u8',
//   },
//   {
//     id: '2',
//     name: 'Opus',
//     url: 'https://stream-live.lrt.lt/opus/stream03/streamPlaylist.m3u8',
//   },
//   {
//     id: '3',
//     name: 'Klasika',
//     url: 'https://stream-live.lrt.lt/klasika/stream03/streamPlaylist.m3u8',
//   },
//   {
//     id: '4',
//     name: 'TV3 Ⓢ',
//     url: 'https://live.lietuvosryto.tv/live/hls/eteris.m3u8',
//   },
//   {
//     id: '5',
//     name: 'foxkidstv',
//     url: 'https://foxkidstv.be:3369/stream/play.m3u8',
//   },
//   {
//     id: '6',
//     name: 'mcdn',
//     url: 'https://daserste-live.ard-mcdn.de/daserste/live/hls/de/master.m3u8',
//   },
// ];

