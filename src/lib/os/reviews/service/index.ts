/**
 * Yash OS Reviews Service Module
 *
 * Provides a unified entry point and service factory for Reviews operations.
 * Defaults to LocalStorageReviewsAdapter, allowing transparent substitution with
 * CloudReviewsAdapter when cloud backend services are connected.
 */

import type { IReviewsService } from "./types";
import { LocalStorageReviewsAdapter } from "./localAdapter";

export * from "./types";
export * from "./localAdapter";
export * from "./cloudAdapterContract";
export * from "./contracts";

let activeService: IReviewsService | null = null;

/**
 * Returns the current active ReviewsService instance.
 * Defaults to LocalStorageReviewsAdapter for local-first execution.
 */
export function getReviewsService(): IReviewsService {
  if (!activeService) {
    activeService = new LocalStorageReviewsAdapter();
  }
  return activeService;
}

/**
 * Allows switching the active ReviewsService adapter (e.g. for testing or cloud sync).
 */
export function setReviewsService(service: IReviewsService): void {
  activeService = service;
}
