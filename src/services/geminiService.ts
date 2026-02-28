import { GoogleGenAI } from "@google/genai";

export async function detectFace(capturedFaceBase64: string): Promise<{ hasFace: boolean; isObstructed: boolean; message: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Analyze this image. Is there a human face clearly visible? Is there any obstruction on the face (like a mask, hand covering the face, or objects blocking it)? Respond ONLY with a JSON object: { \"hasFace\": boolean, \"isObstructed\": boolean, \"message\": string }." },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: capturedFaceBase64.split(',')[1] || capturedFaceBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      hasFace: result.hasFace || false,
      isObstructed: result.isObstructed || false,
      message: result.message || ""
    };
  } catch (error) {
    console.error("Face detection error:", error);
    return { hasFace: false, isObstructed: false, message: "Error detecting face" };
  }
}

export async function verifyFace(storedFaceBase64: string, capturedFaceBase64: string): Promise<{ match: boolean; confidence: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Compare these two images. Are they the same person? Respond ONLY with a JSON object: { \"match\": boolean, \"confidence\": number, \"reason\": string }. The confidence should be between 0 and 1." },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: storedFaceBase64.split(',')[1] || storedFaceBase64
            }
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: capturedFaceBase64.split(',')[1] || capturedFaceBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      match: result.match || false,
      confidence: result.confidence || 0
    };
  } catch (error) {
    console.error("Face verification error:", error);
    return { match: false, confidence: 0 };
  }
}
