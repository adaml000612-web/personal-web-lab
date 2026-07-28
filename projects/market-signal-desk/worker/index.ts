/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "./security";
import { recordMetric } from "../server/admin-store";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(response, request);
    }

    const startedAt = Date.now();
    try {
      const response = withSecurityHeaders(await handler.fetch(request, env, ctx), request);
      if (shouldMonitor(url.pathname)) {
        ctx.waitUntil(recordMetric({
          route: url.pathname,
          status: response.status,
          durationMs: Date.now() - startedAt,
        }));
      }
      return response;
    } catch (error) {
      if (shouldMonitor(url.pathname)) {
        ctx.waitUntil(recordMetric({
          route: url.pathname,
          status: 500,
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.name : "Unhandled error",
        }));
      }
      throw error;
    }
  },
};

function shouldMonitor(pathname: string) {
  return !pathname.startsWith("/_")
    && !pathname.startsWith("/favicon")
    && !/\.(?:css|js|map|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(pathname);
}

export default worker;
