const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const htmlFiles = [
  'user-dashboard.html',
  'inventory-view.html',
  'admin-dashboard.html',
  'admin-inventory.html',
  'login.html',
  'profile.html'
];

const jsFiles = [
  'auth.js',
  'user-dashboard.js',
  'inventory-view.js',
  'admin-dashboard.js',
  'admin-inventory.js'
];

const cssFiles = [
  'styles.css'
];

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Update HTML files to use minified resources
async function processHtmlFiles() {
  console.log('Processing HTML files...');
  
  for (const htmlFile of htmlFiles) {
    if (!fs.existsSync(htmlFile)) {
      console.warn(`Warning: ${htmlFile} does not exist. Skipping.`);
      continue;
    }
    
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Replace CSS links
    htmlContent = htmlContent.replace(
      /<link rel="stylesheet" href="styles.css">/g,
      '<link rel="stylesheet" href="styles.min.css">'
    );
    
    // Replace individual JS scripts with the combined, minified file
    jsFiles.forEach(jsFile => {
      const scriptPattern = new RegExp(`<script src="${jsFile}"></script>`, 'g');
      htmlContent = htmlContent.replace(scriptPattern, '');
    });
    
    // Add the combined JS file before the closing body tag
    htmlContent = htmlContent.replace(
      '</body>',
      '    <script src="app.min.js"></script>\n</body>'
    );
    
    fs.writeFileSync(path.join(distDir, htmlFile), htmlContent);
    console.log(`  - Processed ${htmlFile}`);
  }
}

// Copy images folder (if it exists)
function copyImages() {
  const imagesDir = path.join(__dirname, 'images');
  const distImagesDir = path.join(distDir, 'images');
  
  if (fs.existsSync(imagesDir)) {
    console.log('Copying images...');
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir);
    }
    
    copyDirectory(imagesDir, distImagesDir);
  } else {
    console.log('No images directory found. Skipping image copy.');
  }
}

// Utility function to copy a directory recursively
function copyDirectory(source, destination) {
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

// Main build function
async function buildDist() {
  try {
    console.log('Starting build process...');
    
    // Clean previous build if it exists
    console.log('Cleaning previous build...');
    await execPromise('npm run clean');
    
    // Minify CSS
    console.log('Minifying CSS...');
    await execPromise('npm run minify:css');
    
    // Minify JS
    console.log('Minifying JavaScript...');
    await execPromise('npm run minify:js');
    
    // Process HTML files to use minified resources
    await processHtmlFiles();
    
    // Copy images
    copyImages();
    
    // Copy font awesome (if referenced locally)
    const fontAwesomeDir = path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free');
    if (fs.existsSync(fontAwesomeDir)) {
      console.log('Copying Font Awesome...');
      const distFontsDir = path.join(distDir, 'fonts');
      if (!fs.existsSync(distFontsDir)) {
        fs.mkdirSync(distFontsDir);
      }
      copyDirectory(path.join(fontAwesomeDir, 'webfonts'), distFontsDir);
    }
    
    console.log('\nBuild completed successfully! Files are in the dist/ directory.');
    console.log('Run "npm run serve" to test the distribution locally.');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildDist(); 