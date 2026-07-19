import os
import re
from bs4 import BeautifulSoup

file_path = r"C:\Users\smufa\.gemini\antigravity-ide\brain\5c7a2634-662c-4664-8ad8-be0adde11c7c\.system_generated\steps\882\content.md"

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    # Remove script/style
    for s in soup(['script', 'style']):
        s.decompose()
        
    text = soup.get_text(separator='\n')
    # collapse multiple newlines
    text = re.sub(r'\n+', '\n', text)
    print("Parsed successfully. Writing to clean_doc.txt...")
    with open(r"c:\Users\smufa\Desktop\NexCart_updated\scratch\clean_doc.txt", "w", encoding="utf-8") as out:
        out.write(text)
else:
    print("File not found.")
