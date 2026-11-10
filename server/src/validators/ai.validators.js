/**
 * Validates request payload for POST /api/ai/chat
 */
export const validateAiChat = (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Request body must be a valid JSON object.',
        statusCode: 400
      }
    });
  }

  const { message, history } = body;

  // Validate message
  if (message === undefined || message === null) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Prompt message is required.',
        statusCode: 400
      }
    });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Message must be a string.',
        statusCode: 400
      }
    });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Message cannot be empty.',
        statusCode: 400
      }
    });
  }

  if (trimmedMessage.length > 1000) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Message cannot exceed 1000 characters.',
        statusCode: 400
      }
    });
  }

  // Validate history if present
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'History must be an array of conversation turns.',
          statusCode: 400
        }
      });
    }

    if (history.length > 20) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Conversation history cannot exceed 20 messages.',
          statusCode: 400
        }
      });
    }

    const ALLOWED_ROLES = ['user', 'assistant'];
    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      if (!turn || typeof turn !== 'object') {
        return res.status(400).json({
          success: false,
          error: {
            message: `History entry at index ${i} must be an object.`,
            statusCode: 400
          }
        });
      }

      if (!ALLOWED_ROLES.includes(turn.role)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid role "${turn.role}" at history index ${i}. Allowed roles: "user", "assistant".`,
            statusCode: 400
          }
        });
      }

      if (typeof turn.content !== 'string' || turn.content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Content for history turn at index ${i} must be a non-empty string.`,
            statusCode: 400
          }
        });
      }

      if (turn.content.length > 2000) {
        return res.status(400).json({
          success: false,
          error: {
            message: `History content at index ${i} exceeds maximum length of 2000 characters.`,
            statusCode: 400
          }
        });
      }
    }
  }

  // Attach sanitized fields to req
  req.sanitizedAiChat = {
    message: trimmedMessage,
    history: Array.isArray(history) ? history : []
  };

  next();
};

export default {
  validateAiChat
};

