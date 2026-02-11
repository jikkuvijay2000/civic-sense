from flask import Flask, request, jsonify
import os
import random
import requests
from io import BytesIO

app = Flask(__name__)

# Configuration
HF_API_TOKEN = os.environ.get("HF_API_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large"

# Global variables for local model (lazy loaded)
processor = None
model = None
device = None

def load_local_model():
    global processor, model, device
    if model is None:
        print("Loading local model (this may take a while and uses significant RAM)...")
        try:
            from transformers import BlipProcessor, BlipForConditionalGeneration
            from PIL import Image
            import torch
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {device}")
            
            # Use base model for local fallback to save some RAM compared to large
            model_id = "Salesforce/blip-image-captioning-base" 
            processor = BlipProcessor.from_pretrained(model_id)
            model = BlipForConditionalGeneration.from_pretrained(model_id).to(device)
            print("Local model loaded successfully.")
        except Exception as e:
            print(f"Failed to load local model: {e}")
            raise e

def query_hf_api(image_data):
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    response = requests.post(HF_API_URL, headers=headers, data=image_data)
    return response.json()

@app.route("/caption", methods=["POST"])
def caption():
    global processor, model, device
    
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files["image"]
        image_data = image_file.read()

        caption_text = ""

        # STRATEGY 1: Try Hugging Face API if token is available
        if HF_API_TOKEN:
            try:
                print("Attempting to use Hugging Face API...")
                api_response = query_hf_api(image_data)
                
                # Check for errors in API response
                if isinstance(api_response, dict) and "error" in api_response:
                    print(f"HF API Error: {api_response['error']}")
                    # If model is loading, we might want to wait or fallback. 
                    # For now, let's fallback to local if it's a real error.
                    raise Exception(f"HF API rejected request: {api_response['error']}")
                
                # Successful response is usually a list of dicts: [{'generated_text': '...'}]
                if isinstance(api_response, list) and len(api_response) > 0:
                    caption_text = api_response[0].get("generated_text", "")
                    print(f"HF API Success: {caption_text}")
            except Exception as e:
                print(f"HF API failed: {e}. Falling back to local model.")
                # Reset file pointer for local read
                image_file.seek(0)
        
        # STRATEGY 2: Local Model Fallback
        if not caption_text:
            # Import Image here to avoid top-level dependency if API works
            from PIL import Image
            
            # Ensure file pointer is at start (in case API read it)
            image_file.seek(0)
            
            load_local_model()
            
            image = Image.open(image_file).convert("RGB")
            
            # Conditional generation
            text = "a photograph of"
            inputs = processor(images=image, text=text, return_tensors="pt").to(device)

            outputs = model.generate(
                **inputs,
                max_new_tokens=80,       
                min_new_tokens=20,       
                num_beams=3,
                repetition_penalty=1.2,  
                early_stopping=True
            )

            caption_text = processor.decode(outputs[0], skip_special_tokens=True)

        # Post-process: Clean the caption
        clean_caption = caption_text.lower().replace("a photograph of ", "").replace("an image of ", "").replace("a photo of ", "")
        
        # Dynamic Complaint Templates
        templates = [
            f"I would like to report {clean_caption} in this area. This issue is causing inconvenience to the public. Please take necessary action.",
            f"I noticed {clean_caption} here. It looks like a hazard and needs immediate attention from the authorities.",
            f"Reporting a case of {clean_caption}. This has been persistent for a while and requires a fix.",
            f"There is {clean_caption} at this location. It is disrupting the neighborhood. Please investigate.",
            f"Urgent attention required for {clean_caption}. Residents are facing difficulties due to this.",
             f"I am writing to bring to your attention {clean_caption}. Please resolve this matter as soon as possible."
        ]
        
        complaint_text = random.choice(templates)

        return jsonify({
            "description": complaint_text
        })

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
