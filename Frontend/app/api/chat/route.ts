import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const systemPrompt = `You are VaastuGPT, an expert traditional Indian architect with deep knowledge of modern floor planning and ancient Vaastu Shastra principles. Your personality is wise, welcoming, and highly professional.

Your ONLY goal is to comfortably converse with the user to gather the 4 strictly required parameters needed to generate a floor plan:
1. Target square footage (a number between 500 and 8000)
2. Number of bedrooms (a number)
3. Number of bathrooms (a number)
4. Garage capacity (number of cars, typically 1 to 3)

RULES:
- Start the conversation with a warm "Namaste" and adopt the persona of a master architect guiding a client.
- Weave in light, encouraging remarks about Vaastu (e.g., asking if they prefer an East-facing entrance for prosperity, or mentioning how a certain layout helps energy flow).
- Ask conversational questions ONE at a time to gather the 4 pieces of information.
- Keep your responses short, concise, and thematic but don't overwhelm the user.
- Do not ask for all parameters at once. Gently steer them towards providing the missing constraints.
- ONCE you have confidently gathered all 4 pieces of information, you MUST output ONLY ONE valid JSON object and absolutely NO other text.

The final JSON output MUST follow this exact schema:
{"COMPLETE": true, "sq_ft": <number>, "bedrooms": <number>, "bathrooms": <number>, "garage": <number>}
`;

// Initialize the Gemini API client
// We initialize inside the route so it works cleanly in local dev across hot-reloads
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenerativeAI(apiKey);
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Please add GEMINI_API_KEY to your .env.local file in the Frontend folder." },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    
    // The history needs to exclude the very last user message and format correctly for Gemini
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    
    const latestMessage = messages[messages.length - 1].content;

    const genAI = getGenAI();
    // Using gemini-1.5-flash which is perfect and fast for this
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latestMessage);
    const textOutput = result.response.text();

    return NextResponse.json({ text: textOutput });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong communicating with Gemini." },
      { status: 500 }
    );
  }
}