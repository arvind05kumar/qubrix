const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'script.js');
const imagesDir = path.join(__dirname, 'images');

// Check if images directory exists
if (!fs.existsSync(imagesDir)) {
  console.log('Images directory does not exist yet. Please create an "images" folder.');
  process.exit(1);
}

// Get all folders in images directory
const folders = fs.readdirSync(imagesDir).filter(f => fs.statSync(path.join(imagesDir, f)).isDirectory());

let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Match the products array block
const productsRegex = /const products=\[\s*([\s\S]*?)\s*\];/;
const match = scriptContent.match(productsRegex);

if (!match) {
  console.error("Could not find products array in script.js");
  process.exit(1);
}

const productsBlock = match[1];
const productObjects = productsBlock.split('},').map(s => s.trim() + (s.trim().endsWith('}') ? '' : '}')).filter(s => s.length > 5);

let updatedObjects = productObjects.map(objStr => {
  // Extract id and name
  const idMatch = objStr.match(/id:'([^']+)'/);
  const nameMatch = objStr.match(/name:'([^']+)'/);
  
  if (!idMatch || !nameMatch) return objStr;
  
  const id = idMatch[1];
  const name = nameMatch[1];
  
  // Find matching folder (by name or id)
  let matchingFolder = folders.find(f => f.toLowerCase() === name.toLowerCase() || f.toLowerCase() === id.toLowerCase());
  
  let imagesList = [];
  if (matchingFolder) {
    const folderPath = path.join(imagesDir, matchingFolder);
    const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    
    // Sort files logically (e.g. 1.jpg before 10.jpg)
    files.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    imagesList = files.map(f => `images/${matchingFolder}/${f}`);
  }
  
  // Remove existing images property if it exists
  let newObjStr = objStr.replace(/,images:\[.*?\]/g, '');
  
  // Add images property right after id or name
  if (imagesList.length > 0) {
    newObjStr = newObjStr.replace(/{id:'[^']+',/, `$&images:[${imagesList.map(img => `'${img}'`).join(',')}],`);
  }
  
  return newObjStr;
});

const newProductsArray = `const products=[\n  ${updatedObjects.join(',\n  ').replace(/}\}/g, '}')}\n];`;

scriptContent = scriptContent.replace(productsRegex, newProductsArray);
fs.writeFileSync(scriptPath, scriptContent);

console.log('✅ Successfully updated script.js with product images!');
