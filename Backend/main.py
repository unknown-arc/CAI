from flask import Flask, request, jsonify
from models.model_gpt import gpt
import os
app = Flask(__name__)

@app.route("/ask", methods=["POST"])
def chat():
    try:
        data = request.json
        user_message = data.get("message", "")

        reply = gpt(user_message) 
        return jsonify({
            "response": reply
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/", methods=["GET"])
def home():
    return "Flask API running"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))