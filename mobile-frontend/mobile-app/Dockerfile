# mobile-frontend/mobile-app/Dockerfile
FROM nginx:alpine

# Copy Expo web build
COPY dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
