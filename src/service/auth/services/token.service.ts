import { randomBytes } from "crypto";
import prisma from "@/config/prisma";
import { TokenError } from "../errors/auth.errors";

export interface TokenData {
  id: string;
  token: string;
  userId?: string;
  studentId?: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreateTokenOptions {
  userId?: string;
  studentId?: string;
  expiresInDays?: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ValidatedToken {
  id: string;
  userId?: string;
  studentId?: string;
  email: string;
  role: "admin" | "student";
  isFirstLogin?: boolean;
  name?: string;
  class?: string;
  category?: "Gengo" | "Bunka";
}

export class TokenService {
  private static readonly DEFAULT_EXPIRY_DAYS = 7;
  private static readonly TOKEN_LENGTH = 64; // 64 bytes = 128 hex chars

  /**
   * Generate a secure random token
   */
  static generateSecureToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString("hex");
  }

  /**
   * Create a new auth token and store it in the database
   */
  static async createToken(options: CreateTokenOptions): Promise<TokenData> {
    const {
      userId,
      studentId,
      expiresInDays = this.DEFAULT_EXPIRY_DAYS,
      userAgent,
      ipAddress,
    } = options;

    if (!userId && !studentId) {
      throw new TokenError("Must provide userId or studentId");
    }

    try {
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const authToken = await prisma.authToken.create({
        data: {
          token,
          user_id: userId,
          student_id: studentId,
          expires_at: expiresAt,
          user_agent: userAgent,
          ip_address: ipAddress,
        },
      });

      return {
        id: authToken.id,
        token: authToken.token,
        userId: authToken.user_id ?? undefined,
        studentId: authToken.student_id ?? undefined,
        expiresAt: authToken.expires_at,
        userAgent: authToken.user_agent ?? undefined,
        ipAddress: authToken.ip_address ?? undefined,
      };
    } catch (error) {
      console.error("Error creating token:", error);
      throw new TokenError("Failed to create authentication token");
    }
  }

  /**
   * Validate a token and return user info if valid
   */
  static async validateToken(token: string): Promise<ValidatedToken | null> {
    try {
      const authToken = await prisma.authToken.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          student: {
             select: {
                id: true,
                email: true,
                is_first_login: true,
                name: true,
                class: true,
                category: true,
             }
          }
        },
      });

      // Token not found
      if (!authToken) {
        return null;
      }

      // Token is revoked
      if (authToken.is_revoked) {
        return null;
      }

      // Token is expired
      if (new Date() > authToken.expires_at) {
        // Optionally clean up expired token
        await this.revokeToken(token);
        return null;
      }

      // Update last used timestamp
      await prisma.authToken.update({
        where: { id: authToken.id },
        data: { last_used_at: new Date() },
      });

      if (authToken.user) {
         return {
           id: authToken.id,
           userId: authToken.user.id,
           email: authToken.user.email,
           role: "admin"
         };
      }

      if (authToken.student) {
         return {
            id: authToken.id,
            studentId: authToken.student.id,
            email: authToken.student.email ?? "",
            role: "student",
            isFirstLogin: authToken.student.is_first_login,
            name: authToken.student.name,
            class: authToken.student.class,
            category: authToken.student.category,
         };
      }

      return null;
    } catch (error) {
      console.error("Error validating token:", error);
      return null;
    }
  }

  /**
   * Revoke a specific token
   */
  static async revokeToken(token: string): Promise<boolean> {
    try {
      await prisma.authToken.update({
        where: { token },
        data: { is_revoked: true },
      });
      return true;
    } catch (error) {
      console.error("Error revoking token:", error);
      return false;
    }
  }

  /**
   * Revoke all tokens for a user (useful for "logout from all devices")
   */
  static async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      await prisma.authToken.updateMany({
        where: { 
          OR: [
            { user_id: userId },
            { student_id: userId }
          ],
          is_revoked: false,
        },
        data: { is_revoked: true },
      });
      return true;
    } catch (error) {
      console.error("Error revoking all user tokens:", error);
      return false;
    }
  }

  /**
   * Delete a specific token from database
   */
  static async deleteToken(token: string): Promise<boolean> {
    try {
      await prisma.authToken.delete({
        where: { token },
      });
      return true;
    } catch (error) {
      console.error("Error deleting token:", error);
      return false;
    }
  }

  /**
   * Clean up expired tokens (can be run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.authToken.deleteMany({
        where: {
          OR: [
            { expires_at: { lt: new Date() } },
            { is_revoked: true },
          ],
        },
      });
      return result.count;
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
      return 0;
    }
  }

  /**
   * Get all active tokens for a user
   */
  static async getUserTokens(userId: string) {
    try {
      const tokens = await prisma.authToken.findMany({
        where: {
          OR: [
             { user_id: userId },
             { student_id: userId }
          ],
          is_revoked: false,
          expires_at: { gt: new Date() },
        },
        select: {
          id: true,
          created_at: true,
          last_used_at: true,
          user_agent: true,
          ip_address: true,
          expires_at: true,
        },
        orderBy: {
          last_used_at: "desc",
        },
      });
      return tokens;
    } catch (error) {
      console.error("Error getting user tokens:", error);
      return [];
    }
  }

  /**
   * Extend token expiry
   */
  static async extendTokenExpiry(token: string, days: number = 7): Promise<boolean> {
    try {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      await prisma.authToken.update({
        where: { token },
        data: { expires_at: newExpiresAt },
      });
      return true;
    } catch (error) {
      console.error("Error extending token expiry:", error);
      return false;
    }
  }
}

export default TokenService;
