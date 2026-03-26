# responder.py

from openai import OpenAI
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

token = os.environ["GITHUB_TOKEN"]
endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4.1"


client = OpenAI(
    base_url=endpoint,
    api_key=token,
)

def get_ai_response(user_message):

    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "",
            },
            {
                "role": "user",
                "content": "What is the capital of France?",
            }
        ],
        temperature=1,
        top_p=1,
        model=model
    )

    return(response.choices[0].message.content)




# ✅ Flask route uses your AI
@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    user_message = data.get("message")

    try:
        reply = get_ai_response(user_message)
        return jsonify({"response": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000)