import { getOpenAIClient, isOpenAIAvailable, getOpenAIModel } from '../config/openai.js';
import {
  getAllActiveCatalogProducts,
  formatCatalogForPrompt,
  hydrateProductsBySlugs,
  getOfflineCatalogResponse
} from './ai-grounding.service.js';

/**
 * Builds the system prompt grounding the assistant in live PostgreSQL catalog data.
 *
 * @param {Array<Object>} catalog
 * @returns {string} System prompt
 */
const buildSystemPrompt = (catalog) => {
  const catalogText = formatCatalogForPrompt(catalog);

  return `You are NexCart's AI Shopping Assistant, an expert, friendly, and honest e-commerce advisor.
You assist customers with product recommendations, comparisons, budget queries, and stock checks.

AUTHORITATIVE CATALOG GROUNDING RULES:
1. You MUST ONLY recommend, cite, and reference products that exist in the "OFFICIAL NEXCART CATALOG" listed below.
2. NEVER invent, hallucinate, or suggest any products, prices, or specifications that are not in the catalog.
3. All prices are in Indian Rupees (₹, INR). Always cite the exact price as listed in the catalog.
4. Stock awareness: If stock is 0, warn the user the item is out of stock. If stock is between 1 and 5, mention low stock.
5. If the customer's request cannot be met (e.g. asking for products NexCart does not sell, or a price point with no matches), explain honestly and politely suggest the closest active catalog product.
6. Slugs: When you recommend or discuss any products, you MUST list their exact catalog "slug" in the "product_slugs" array in your JSON output.
7. Output format: You MUST return a JSON object with:
   - "reply": (string) Markdown formatted conversational answer. Be concise, structured, and helpful (use bullet points and bold headers).
   - "product_slugs": (string[]) Array of exact product slugs for any products recommended in your reply.

OFFICIAL NEXCART CATALOG:
${catalogText}
`;
};

/**
 * Generates an AI shopping response for the customer's query.
 * Grounded in PostgreSQL catalog data and backed by OpenAI GPT.
 * Gracefully falls back to offline catalog search if OpenAI is unavailable or errors out.
 *
 * @param {Object} params
 * @param {string} params.message Customer's prompt
 * @param {Array<{role: string, content: string}>} [params.history=[]] Conversation history
 * @returns {Promise<{ reply: string, products: Array<Object>, isAiGrounded: boolean, source: string }>}
 */
export const generateShoppingResponse = async ({ message, history = [] }) => {
  // If OpenAI is not configured, gracefully fall back to live catalog query engine
  if (!isOpenAIAvailable()) {
    const fallback = await getOfflineCatalogResponse(message);
    return {
      reply: `${fallback.reply}\n\n*(Note: NexCart AI Assistant is currently in live catalog mode. Configure OPENAI_API_KEY for conversational AI analysis.)*`,
      products: fallback.products,
      isAiGrounded: false,
      source: 'catalog_offline'
    };
  }

  try {
    const client = getOpenAIClient();
    const model = getOpenAIModel();
    const catalog = await getAllActiveCatalogProducts();
    const systemPrompt = buildSystemPrompt(catalog);

    // Format sanitized history (only valid user/assistant roles)
    const formattedHistory = (Array.isArray(history) ? history : [])
      .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-10) // Limit to last 10 messages for context efficiency
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 2000)
      }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: message }
    ];

    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000
    });

    const rawContent = completion.choices[0]?.message?.content;
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        reply: rawContent || 'I found some items in our catalog for you.',
        product_slugs: []
      };
    }

    // Hydrate authentic products from database matching the slugs
    let recommendedProducts = [];
    if (Array.isArray(parsed.product_slugs) && parsed.product_slugs.length > 0) {
      recommendedProducts = await hydrateProductsBySlugs(parsed.product_slugs);
    }

    return {
      reply: parsed.reply || 'Here are my recommendations from the NexCart catalog:',
      products: recommendedProducts,
      isAiGrounded: true,
      source: 'openai'
    };
  } catch (error) {
    console.warn('[AI Assistant Warning] OpenAI request failed, falling back to catalog search:', error.message);
    const fallback = await getOfflineCatalogResponse(message);
    return {
      reply: `${fallback.reply}\n\n*(AI service is temporarily experiencing high load. Showing catalog matches directly.)*`,
      products: fallback.products,
      isAiGrounded: false,
      source: 'catalog_fallback'
    };
  }
};

export default {
  generateShoppingResponse
};

