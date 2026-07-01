import os
import re
import tempfile
import urllib.request
import ssl
from typing import List, Optional

try:
    from PyPDF2 import PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

def extract_volumes_from_text(text: str) -> List[str]:
    """
    Ищет в тексте предложения с упоминаниями объемов:
    - квадратные метры (м2, кв.м.)
    - тонны (т, тонн)
    - профильные слова (АКЗ, огнезащита, пескоструй)
    """
    found_sentences = []
    
    # Split by dots or newlines to get sentences
    sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
    
    target_patterns = [
        r'\b(?:м2|кв\.?\s*м\.?|квадратных метров)\b',
        r'\b(?:т|тонн|тн)\b',
        r'\b(?:АКЗ|огнезащит[а-я]*|антикор[а-я]*|пескоструй[а-я]*)\b'
    ]
    
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 10 or len(sentence) > 500:
            continue
            
        # Check if sentence has numbers (usually volumes have numbers)
        has_numbers = bool(re.search(r'\d+', sentence))
        
        matches_pattern = any(re.search(pat, sentence, re.IGNORECASE) for pat in target_patterns)
        
        if matches_pattern and (has_numbers or "АКЗ" in sentence.upper()):
            # Deduplicate
            if sentence not in found_sentences:
                found_sentences.append(sentence)
                
    return found_sentences

def parse_document_from_url(url: str, ext: str) -> str:
    """
    Скачивает документ по ссылке и извлекает из него найденные объемы работ.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=30) as response:
            content = response.read()
            
            # Avoid processing huge files > 20MB for MVP
            if len(content) > 20 * 1024 * 1024:
                return ""
                
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            extracted_text = ""
            
            try:
                if ext.lower() == 'pdf' and HAS_PYPDF2:
                    reader = PdfReader(tmp_path)
                    for page in reader.pages[:20]: # Check only first 20 pages
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                            
                elif ext.lower() in ['docx', 'doc'] and HAS_DOCX:
                    doc = Document(tmp_path)
                    for para in doc.paragraphs[:100]: # Check only first 100 paragraphs
                        extracted_text += para.text + "\n"
                        
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass
                        
            if extracted_text:
                volumes = extract_volumes_from_text(extracted_text)
                if volumes:
                    return "\n".join([f"• {v}" for v in volumes[:3]]) # Return top 3 matched sentences
                    
    except Exception as e:
        print(f"Error parsing document {url}: {e}")
        
    return ""
