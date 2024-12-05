from flask import Flask, request, jsonify
import json
import os
from main import run

# Enable CORS for development
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/research', methods=['POST'])
def research():
    try:
        content = request.get_json()
        if not content or 'text' not in content:
            return jsonify({"error": "Missing 'text' field in request"}), 400
            
        print(f"Received research request: {content['text'][:100]}...")
        
        # Verify API keys are present
        required_vars = ["SERPER_API_KEY", "BRAVE_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            return jsonify({
                "error": f"Missing required API keys: {', '.join(missing_vars)}"
            }), 500
            
        try:
            print("Starting research process...")
            result = run(content)
            
            # Ensure the result is properly formatted
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except json.JSONDecodeError:
                    return jsonify({"error": "Invalid result format", "raw_result": result}), 500
            
            # Validate result structure
            if not result or not isinstance(result, dict):
                return jsonify({"error": "Invalid result structure", "details": "Expected dictionary result"}), 500
                
            print("Research completed successfully")
            return jsonify(result)
        except Exception as e:
            print(f"Research process error: {str(e)}")
            error_details = str(e)
            if "API key" in error_details.lower():
                return jsonify({"error": "API configuration error", "details": error_details}), 500
            elif "search" in error_details.lower():
                return jsonify({"error": "Search operation failed", "details": error_details}), 500
            else:
                return jsonify({"error": "Research process failed", "details": error_details}), 500
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        error_message = str(e)
        if "search" in error_message.lower():
            error_message = "Failed to perform search operation. Please try again."
        return jsonify({"error": error_message}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
