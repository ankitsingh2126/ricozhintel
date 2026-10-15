// Authentication routes for register, login, and user profile.

import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { registerRules, loginRules } from '../validators/authValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerRules, validateRequest, authController.register);
router.post('/login', loginRules, validateRequest, authController.login);
router.get('/me', authenticate, authController.getMe);

export default router;
