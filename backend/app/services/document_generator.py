import os
from datetime import datetime
from docxtpl import DocxTemplate
from typing import Dict, Any
import uuid

def generate_tender_document(template_path: str, output_dir: str, data: Dict[str, Any], filename_prefix: str = "document"):
    """
    Generates a .docx document from a template using docxtpl.
    """
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found: {template_path}")

    # Load template
    doc = DocxTemplate(template_path)
    
    # Render with context data
    doc.render(data)
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate unique filename
    safe_filename = f"{filename_prefix}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.docx"
    output_path = os.path.join(output_dir, safe_filename)
    
    # Save output
    doc.save(output_path)
    
    return output_path
