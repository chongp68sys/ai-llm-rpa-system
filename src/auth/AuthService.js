import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/environment.js';
import { BaseRepository } from '../database/connection.js';

// User repository for authentication
export class UserRepository extends BaseRepository {
  async createUser(userData) {
    const { username, email, password, role = 'user' } = userData;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await this.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, created_at
    `, [username, email, hashedPassword, role]);

    return result.rows[0];
  }

  async findByUsername(username) {
    const result = await this.query(`
      SELECT * FROM users WHERE username = $1 AND active = true
    `, [username]);

    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const result = await this.query(`
      SELECT * FROM users WHERE email = $1 AND active = true
    `, [email]);

    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await this.query(`
      SELECT id, username, email, role, created_at, last_login
      FROM users WHERE id = $1 AND active = true
    `, [id]);

    return result.rows[0] || null;
  }

  async updateLastLogin(userId) {
    await this.query(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
    `, [userId]);
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await this.query(`
      UPDATE users SET password_hash = $1 WHERE id = $2
      RETURNING id, username, email, role
    `, [hashedPassword, userId]);

    return result.rows[0];
  }
}

// Main Authentication Service
export class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = config.security.jwtSecret;
    this.jwtOptions = {
      expiresIn: '24h', // Tokens expire in 24 hours
      issuer: 'ai-llm-rpa-system',
      audience: 'api-users'
    };
  }

  // Register a new user
  async register(userData) {
    const { username, email, password } = userData;
    
    // Validation
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Create user
    try {
      const user = await this.userRepository.createUser(userData);
      
      // Generate token
      const token = this.generateToken(user);
      
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Failed to create user account');
    }
  }

  // Login user
  async login(credentials) {
    const { username, password } = credentials;
    
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Find user
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    };
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, this.jwtOptions);
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if user still exists and is active
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User no longer exists');
      }

      return {
        userId: user.id,
        username: user.username,
        role: user.role,
        user
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  // Middleware for protecting routes
  createAuthMiddleware(options = {}) {
    const { requiredRole } = options;

    return async (req, res, next) => {
      try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token
        const authData = await this.verifyToken(token);
        
        // Check role if required
        if (requiredRole && authData.role !== requiredRole && authData.role !== 'admin') {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Add auth data to request
        req.auth = authData;
        req.user = authData.user;
        
        next();
      } catch (error) {
        return res.status(401).json({ error: error.message });
      }
    };
  }

  // Middleware for optional authentication
  createOptionalAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const authData = await this.verifyToken(token);
          req.auth = authData;
          req.user = authData.user;
        }
        next();
      } catch (error) {
        // For optional auth, we continue even if token is invalid
        next();
      }
    };
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get full user data with password hash
    const fullUser = await this.userRepository.query(
      'SELECT * FROM users WHERE id = $1', 
      [userId]
    );
    
    if (fullUser.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, fullUser.rows[0].password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Update password
    return await this.userRepository.updatePassword(userId, newPassword);
  }

  // Get user profile
  async getProfile(userId) {
    return await this.userRepository.findById(userId);
  }
}

// Export singleton instance
export const authService = new AuthService();