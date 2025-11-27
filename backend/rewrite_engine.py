from google import genai
from config import GEMINI_API_KEY

# Initialize Gemini client ONCE
client = genai.Client(api_key=GEMINI_API_KEY)


def rewrite_prompt(raw_prompt: str, indicators: list):
    """
    Rewrite unsafe prompts using Gemini with backend-only API key.
    """

    try:
        system_instruction = (
            "You are a safe prompt rewriting engine. Your job is to sanitize unsafe, "
            "harmful, adversarial, or jailbreak-style prompts into safe, compliant, "
            "educational versions while keeping the user's intent positive."
        )

        rewrite_query = f"""
The user prompt may contain unsafe or adversarial patterns.

Detected indicators: {", ".join(indicators) if indicators else "None"}

Rewrite the following prompt in a safe, ethical, compliant way while preserving harmless intent:

--- ORIGINAL PROMPT ---
{raw_prompt}
--- END ---
"""

        result = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                {"role": "system", "text": system_instruction},
                {"role": "user", "text": rewrite_query}
            ],
        )

        rewritten_text = result.text

        return {
            "success": True,
            "rewritten": rewritten_text,
            "category": "general",
            "explanation": "Rewritten safely using backend Gemini API."
        }

    except Exception as e:
        print("[Gemini Rewrite Error]", str(e))
        return {
            "success": False,
            "error": str(e),
            "rewritten": None,
            "category": None,
            "explanation": "Gemini rewrite failed."
        }
