import { GoogleGenerativeAI } from '@google/generative-ai';

type SafetySetting = {
  category: string;
  probability: string;
};

type ImageGenerateResponse = {
  images?: Array<{ imageBase64: string; mimeType?: string }>;
  responseId?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  safetyIssues?: Array<{
    category: string;
    probability: string;
    message?: string;
  }>;
};

export interface GeminiImagePayload {
  prompt: string;
  negativePrompt?: string;
  brandSettings?: Record<string, unknown>;
  aspectRatio?: string;
  safetySettings?: SafetySetting[];
  assets?: Array<{ type: string; uri: string }>;
}

const apiKey = process.env.GEMINI_API_KEY;

function getClient() {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client;
}

export async function generateImageWithGemini(payload: GeminiImagePayload) {
  const model = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash';
  const client = getClient();
  const generativeModel = client.getGenerativeModel({ model }) as unknown as {
    generateImages: (request: Record<string, unknown>) => Promise<ImageGenerateResponse>;
  };

  const request: Record<string, unknown> = {
    prompt: payload.prompt,
    negativePrompt: payload.negativePrompt,
    aspectRatio: payload.aspectRatio,
    safetySettings: payload.safetySettings,
    brandSettings: payload.brandSettings,
    assets: payload.assets,
  };

  const response = await generativeModel.generateImages(request);

  if (response.safetyIssues?.length) {
    const message = response.safetyIssues.map((issue) => `${issue.category}: ${issue.probability}`).join(', ');
    const error = new Error(`Generation blocked by safety settings: ${message}`);
    (error as Error & { code?: string }).code = 'SAFETY_BLOCK';
    throw error;
  }

  const image = response.images?.[0];
  if (!image?.imageBase64) {
    throw new Error('No image returned from Gemini');
  }

  const buffer = Buffer.from(image.imageBase64, 'base64');

  return {
    buffer,
    mimeType: image.mimeType ?? 'image/png',
    usage: response.usageMetadata,
    responseId: response.responseId,
  };
}
