const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

// Using regex to grab style
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    fs.writeFileSync('styles.css', styleMatch[1].trim());
    html = html.replace(styleMatch[0], '<link rel="stylesheet" href="styles.css">');
}

// Extract the app logic, checking for exactly <script>
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let lastScriptMatch;
let lastScriptContent;

while ((match = scriptRegex.exec(html)) !== null) {
   lastScriptMatch = match[0];
   lastScriptContent = match[1];
}

if (lastScriptMatch) {
    fs.writeFileSync('app.js', lastScriptContent.trim());
    html = html.replace(lastScriptMatch, '<script defer src="app.js"></script>');
}

fs.writeFileSync('index.html', html);
console.log("Successfully extracted styles.css and app.js!");
