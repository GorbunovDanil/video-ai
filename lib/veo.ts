export interface VeoJobRequest {
  prompt: string;
  brandSettings?: Record<string, unknown>;
  assets?: Array<{ type: string; uri: string }>;
  aspectRatio?: string;
  durationSeconds?: number;
  stylePreset?: string;
  quality?: 'fast' | 'standard';
  watermarkEnabled?: boolean;
  projectId: string;
  renderId: string;
  finalize?: boolean;
}

export interface VeoJobResponse {
  jobId: string;
  estimatedCredits?: number;
}

function getEndpoint(quality: 'fast' | 'standard', finalize?: boolean) {
  if (finalize) {
    return process.env.VEO_FINAL_ENDPOINT;
  }
  return quality === 'fast' ? process.env.VEO_FAST_ENDPOINT : process.env.VEO_ENDPOINT;
}

export async function createVeoJob(request: VeoJobRequest): Promise<VeoJobResponse> {
  const baseUrl = getEndpoint(request.quality ?? 'standard', request.finalize);
  if (!baseUrl) {
    throw new Error('Veo endpoint is not configured');
  }

  const apiKey = process.env.VEO_API_KEY;
  if (!apiKey) {
    throw new Error('VEO_API_KEY is not configured');
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      brand_settings: request.brandSettings,
      reference_assets: request.assets,
      aspect_ratio: request.aspectRatio,
      duration_seconds: request.durationSeconds,
      style_preset: request.stylePreset,
      watermark_enabled: request.watermarkEnabled,
      metadata: {
        projectId: request.projectId,
        renderId: request.renderId,
        finalize: request.finalize ?? false,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create Veo job: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { jobId?: string; estimatedCredits?: number };
  if (!payload.jobId) {
    throw new Error('Veo job response missing jobId');
  }

  return {
    jobId: payload.jobId,
    estimatedCredits: payload.estimatedCredits,
  };
}
