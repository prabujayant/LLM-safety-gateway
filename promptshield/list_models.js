const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyADhYsiuNtupCoOGJ0m02bc_yWmNJYZtO0";

async function listModels() {
    // We can't list models via the SDK easily in this version without using the model manager
    // So we will use fetch directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.models) {
        console.log("Available models:");
        data.models.forEach(m => {
            if (m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(m.name);
            }
        });
    } else {
        console.log("No models found or error:", data);
    }
}

listModels();
