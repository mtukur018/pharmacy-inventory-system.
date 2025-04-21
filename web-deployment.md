# Web Deployment Guide

This guide provides instructions for deploying the Pharmacy Inventory Management System to various web hosting platforms.

## General Deployment Process

1. Build the application:
   ```bash
   npm run build
   ```

2. The optimized files will be in the `dist` directory, ready for deployment.

## Deploying to Specific Platforms

### Netlify

1. Create a `netlify.toml` file in your project root:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. Deploy using Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy
   ```

3. Or connect your GitHub repository to Netlify for continuous deployment.

### Vercel

1. Create a `vercel.json` file in your project root:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "package.json", "use": "@vercel/static-build" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "/index.html" }
     ]
   }
   ```

2. Deploy using Vercel CLI:
   ```bash
   npm install -g vercel
   vercel
   ```

3. Or connect your GitHub repository to Vercel for continuous deployment.

### Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase:
   ```bash
   firebase login
   firebase init hosting
   ```
   - Select "Dist" as your public directory
   - Configure as a single-page app
   - Don't overwrite index.html

3. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

### GitHub Pages

1. Install gh-pages package:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to package.json:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

### Traditional Web Hosting (cPanel, etc.)

1. Build the application:
   ```bash
   npm run build
   ```

2. Upload the contents of the `dist` directory to your web server using FTP or your hosting provider's file manager.

3. If your hosting supports `.htaccess` (Apache), create a file in your `dist` folder:
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. For Nginx servers, add this to your server configuration:
   ```
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

## Environment Configuration

For production environments, consider the following:

1. Update API endpoints in your application to point to production servers.
2. Set up proper CORS headers on your API server.
3. Configure proper cache headers for static assets.
4. Set up HTTPS for secure communication.

## Monitoring and Analytics

Consider adding:

1. Google Analytics or other web analytics tools.
2. Error monitoring services like Sentry.
3. Performance monitoring tools like Lighthouse.

## Continuous Integration/Continuous Deployment (CI/CD)

For automated deployments, consider setting up CI/CD with:

1. GitHub Actions
2. GitLab CI
3. Jenkins
4. CircleCI

This will automate the build and deployment process whenever changes are pushed to your repository. 