# Video AI Studio

A Next.js dashboard that helps marketers and founders quickly generate platform-ready ad creatives using AI. The workspace focuses on a streamlined **AI Video-Ad Personalizer** with complementary image generation so campaigns can move from idea to export in minutes.

## MVP Overview
- **Image Ads:** Rapid variations in 1:1, 4:5, and 9:16 using Google Gemini 2.5 Flash Image ("Nano Banana") or OpenAI image models.
- **Video Ads:** Short-form ads rendered via Google Veo 3 (with future Sora 2 support) in vertical and square formats, including fast preview and polished final exports.
- **Creative Brief Inputs:** Collect brand colors, value propositions, target audience notes, and desired style to drive consistent outputs.
- **Template-Powered Workflows:** UGC, product-demo, testimonial, and cinematic presets for both image and video generation.
- **Export-Ready Assets:** Auto-formatted deliverables for TikTok, Instagram, Facebook, and YouTube placements.

## MVP Roadmap

### Phase 0 – Validation & Planning (Week 0)
- Interview 5–10 e-commerce and performance marketers to confirm demand, preferred ad lengths, and pricing sensitivity.
- Finalize feature scope: limit to image + video modes, gallery, account management, and pricing.
- Publish landing page capturing early-access signups and share sample AI outputs.

### Phase 1 – Foundation (Week 1)
- Scaffold Next.js + Tailwind project structure with authenticated layout and navigation between `/image-ad`, `/video-ad`, `/gallery`, `/account`, `/auth`, and `/pricing`.
- Implement user auth, billing placeholders, and credit tracking for image/video generations.
- Stand up storage (S3/GCS) and job infrastructure (Upstash Redis or SQS) for handling render queues.

### Phase 2 – Image Ad Engine (Week 2)
- Integrate Gemini 2.5 Flash Image API with prompt templates for studio, UGC, and before/after compositions.
- Allow brand kits (colors, logos, fonts) to influence background, typography, and overlays.
- Generate 3–6 variants per request, enable quick regenerations, and save selections to the gallery.

### Phase 3 – Video Ad Engine (Weeks 3–4)
- Connect Google Veo 3 Fast for rapid previews and Veo 3 for final renders; queue jobs and surface progress states.
- Auto-generate hook → demo → CTA scripts, pair with AI voiceover and subtitles, and support vertical/square presets.
- Provide side-by-side variant comparison with simple text overlay edits before export.

### Phase 4 – Gallery & Export (Week 4)
- Build gallery views filtered by asset type, campaign, or date with re-edit and duplicate actions.
- Offer download bundles per platform plus shareable preview links for stakeholders.
- Add usage analytics summarizing credits consumed, outputs generated, and estimated ad-ready runtime.

### Phase 5 – Launch Readiness (Week 5)
- Configure pricing tiers (e.g., Starter $19/mo, Pro $49/mo) with Stripe checkout and usage-based overage purchases.
- Implement safety guardrails for copyright, harmful content, and watermarking defaults.
- Produce launch collateral (demo reel, walkthrough, FAQ) and prepare Product Hunt + social campaigns.

## Monetization & Expansion Ideas
- **Usage Credits:** Allow pay-as-you-go purchases for additional Veo renders or bulk image batches.
- **Template Marketplace:** Let power users sell high-performing hook scripts or motion templates.
- **Analytics Add-ons:** Offer performance tagging hooks to import ad metrics and suggest next iterations.
- **Agency Collaboration:** Team workspaces with shared galleries, comment threads, and client approvals.

## Key Resources
- [Google Gemini 2.5 Flash Image Pricing](https://ai.google.dev/pricing)
- [Google Veo 3 Capabilities](https://blog.google/products/google-deepmind/google-veo-genai-video/)
- [OpenAI Sora Updates](https://openai.com/sora)

Stay focused on fast, high-quality ad outputs, iterate on template quality, and grow through performance-minded creators and agencies.
