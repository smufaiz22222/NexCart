const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, '../docs/project_report');
const outputFilePath = path.join(__dirname, '../docs/project_report_compiled.md');

const files = ['chapter1_2.md', 'chapter3_4.md', 'chapter5_6.md', 'chapter7_9.md'];

try {
  console.log('Compiling report chapters...');
  let compiledContent = '';

  files.forEach((file) => {
    const filePath = path.join(reportDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`Reading: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      compiledContent += content + '\n\n---\n\n';
    } else {
      console.warn(`Warning: File not found: ${filePath}`);
    }
  });

  // Write out the compiled file
  fs.writeFileSync(outputFilePath, compiledContent.trim(), 'utf8');
  console.log(`Success! Compiled report written to: ${outputFilePath}`);
} catch (error) {
  console.error('Error compiling project report:', error);
}
