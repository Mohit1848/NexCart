import { Router } from 'express';
import { chatWithAssistant } from '../controllers/ai.controller.js';
import { validateAiChat } from '../validators/ai.validators.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { isOpenAIAvailable, getOpenAIModel } from '../config/openai.js';

const router = Router();

/**
 * GET /api/ai/status
 * Returns current AI Assistant readiness status and configured model
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      available: isOpenAIAvailable(),
      model: getOpenAIModel()
    }
  });
});

/**
 * POST /api/ai/chat
 * Primary conversational shopping endpoint with live PostgreSQL catalog grounding
 */
router.post('/chat', aiRateLimiter, validateAiChat, chatWithAssistant);

export default router;

