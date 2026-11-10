import { generateShoppingResponse } from '../services/ai.service.js';

/**
 * Handles incoming shopper queries to the AI Shopping Assistant.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const chatWithAssistant = async (req, res, next) => {
  try {
    const { message, history } = req.sanitizedAiChat || req.body;

    const result = await generateShoppingResponse({
      message,
      history
    });

    return res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        products: result.products,
        isAiGrounded: result.isAiGrounded,
        source: result.source
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  chatWithAssistant
};

