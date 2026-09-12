import { z } from "zod";

// Base interfaces
export interface AuthUser {
  id: string;
  email: string;
  role?: "admin" | "student";
  isFirstLogin?: boolean;
  name?: string;
  class?: string;
  category?: "Gengo" | "Bunka";
}

// Request DTOs
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

// Response DTOs
export interface AuthResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse extends AuthResponse {
  user?: AuthUser;
  token?: string;
}


export interface UserResponse extends AuthResponse {
  user?: AuthUser;
}

// Validation schemas
export const loginValidationSchema = z.object({
  email: z.string()
    .min(1, "Email harus diisi")
    .max(50, "Email tidak boleh lebih dari 50 karakter")
    .trim(),
  password: z.string()
    .min(1, "Password harus diisi")
    .max(100, "Password tidak boleh lebih dari 100 karakter"),
});


// Helper function to format Zod errors into user-friendly messages
const formatValidationErrors = (error: z.ZodError): string => {
  const errors = error.issues.map(err => {
    const field = err.path.join('.');
    return err.message;
  });
  
  // Join multiple errors with proper formatting
  if (errors.length === 1) {
    return errors[0];
  } else if (errors.length === 2) {
    return `${errors[0]} and ${errors[1]}`;
  } else {
    const lastError = errors.pop();
    return `${errors.join(', ')}, and ${lastError}`;
  }
};

// Type guards
export const validateLoginRequest = (data: unknown): LoginRequestDto => {
  const result = loginValidationSchema.safeParse(data);
  if (!result.success) {
    const friendlyMessage = formatValidationErrors(result.error);
    throw new Error(friendlyMessage);
  }
  return result.data;
};
