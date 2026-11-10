import OpenAI from 'openai';

let cachedClient = null;

/**
 * Checks whether OpenAI integration is configured with an active API key.
 * Prevents application startup crashes or runtime exceptions when API key is missing.
 *
 * @returns {boolean} True if a non-placeholder API key is configured
 */
export const isOpenAIAvailable = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed === '' || trimmed === 'your_openai_api_key_here' || trimmed.startsWith('sk-placeholder')) {
    return false;
  }
  return true;
};

/**
 * Returns the configured OpenAI model name or falls back to 'gpt-4o-mini'
 *
 * @returns {string} Model identifier (e.g., 'gpt-4o-mini')
 */
export const getOpenAIModel = () => {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
};

/**
 * Returns a singleton instance of the OpenAI client if configured, or null.
 *
 * @returns {OpenAI | null}
 */
export const getOpenAIClient = () => {
  if (!isOpenAIAvailable()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY.trim()
    });
  }

  return cachedClient;
};

export default {
  isOpenAIAvailable,
  getOpenAIModel,
  getOpenAIClient
};

