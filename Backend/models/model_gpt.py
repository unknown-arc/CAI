import os
from openai import OpenAI

token = os.environ["GITHUB_TOKEN"]
endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4.1"

client = OpenAI(
    base_url=endpoint,
    api_key=token,
)

def gpt(user_message):
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

    return response.choices[0].message.content

