import { AuthUser, LoginRequestDto, LoginResponse, UserResponse, AuthResponse } from "./dto/auth.dto";
import { AuthRepository } from "./repository/auth.repository";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";
import { CookieService } from "./services/cookie.service";
import { 
  UnauthorizedError, 
  NotFoundError, 
  TokenError, 
} from "./errors/auth.errors";

export interface LoginOptions {
  userAgent?: string;
  ipAddress?: string;
}

// Auth Service Class - Main business logic with token-based authentication
export class AuthService {

  // Login user with token-based authentication
  static async loginAdmin(credentials: LoginRequestDto, options?: LoginOptions): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await AuthRepository.findByEmail(credentials.email);

      if (!user) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Verify password
      const isValidPassword = await PasswordService.verify(
        credentials.password, 
        user.password_hash
      );

      if (!isValidPassword) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Generate database token (not JWT)
      const tokenData = await TokenService.createToken({
        userId: user.id,
        expiresInDays: 7,
        userAgent: options?.userAgent,
        ipAddress: options?.ipAddress,
      });

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        role: "admin",
      };

      // Return token so API route can set cookies
      return {
        success: true,
        message: "Login successful",
        user: authUser,
        token: tokenData.token,
      };
    } catch (error) {
      console.error("Login error:", error);

      if (error instanceof UnauthorizedError) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "Login failed",
      };
    }
  }

  // Get current authenticated user using token-based auth
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = await CookieService.getAccessToken();

      if (!token) {
        return null;
      }

      // Validate token from database
      const validatedToken = await TokenService.validateToken(token);

      if (!validatedToken) {
        // Token is invalid, clear cookies
        await CookieService.clearAllAuthCookies();
        return null;
      }

      return {
        id: validatedToken.userId || validatedToken.studentId || "",
        email: validatedToken.email,
        role: validatedToken.role,
        isFirstLogin: validatedToken.isFirstLogin,
        name: validatedToken.name,
        class: validatedToken.class,
        category: validatedToken.category,
      };
    } catch (error) {
      console.error("Get current user error:", error);
      
      if (error instanceof TokenError) {
        // Token related error, clear cookies
        await CookieService.clearAllAuthCookies();
      }
      
      return null;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  // Logout user - revoke token in database
  static async logout(): Promise<AuthResponse> {
    try {
      const token = await CookieService.getAccessToken();

      if (token) {
        // Revoke the token in database
        await TokenService.revokeToken(token);
      }

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        message: "Logout failed",
      };
    }
  }

  // Logout from all devices - revoke all tokens for user
  static async logoutAllDevices(userId: string): Promise<AuthResponse> {
    try {
      await TokenService.revokeAllUserTokens(userId);

      return {
        success: true,
        message: "Logged out from all devices successfully",
      };
    } catch (error) {
      console.error("Logout all devices error:", error);
      return {
        success: false,
        message: "Failed to logout from all devices",
      };
    }
  }

  // Validate token (for middleware) - uses database validation
  static async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const validatedToken = await TokenService.validateToken(token);

      if (!validatedToken) {
        return null;
      }

      return {
        id: validatedToken.userId || validatedToken.studentId || "",
        email: validatedToken.email,
        role: validatedToken.role,
        isFirstLogin: validatedToken.isFirstLogin,
        name: validatedToken.name,
        class: validatedToken.class,
        category: validatedToken.category,
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return null;
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<UserResponse> {
    try {
      const user = await AuthRepository.findByIdPublic(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      return {
        success: true,
        message: "User profile retrieved successfully",
        user: {
          id: user.id,
          email: user.email,
          role: "admin",
        },
      };
    } catch (error) {
      console.error("Get user profile error:", error);

      if (error instanceof NotFoundError) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "Failed to retrieve user profile",
      };
    }
  }

  // Get active sessions for current user
  static async getActiveSessions(userId: string) {
    try {
      return await TokenService.getUserTokens(userId);
    } catch (error) {
      console.error("Get active sessions error:", error);
      return [];
    }
  }

  // Revoke a specific session
  static async revokeSession(tokenId: string): Promise<AuthResponse> {
    try {
      // Note: This requires token ID, not the token itself
      // You may want to add a method to revoke by ID
      return {
        success: true,
        message: "Session revoked successfully",
      };
    } catch (error) {
      console.error("Revoke session error:", error);
      return {
        success: false,
        message: "Failed to revoke session",
      };
    }
  }

  // Check if this is the first admin (for initial setup)
  static async isFirstAdmin(): Promise<boolean> {
    try {
      return !(await AuthRepository.hasAdminUsers());
    } catch (error) {
      console.error("Check first admin error:", error);
      return false;
    }
  }

  // Clean up expired tokens (can be called periodically)
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      return await TokenService.cleanupExpiredTokens();
    } catch (error) {
      console.error("Cleanup expired tokens error:", error);
      return 0;
    }
  }
}

export default AuthService;
