"use client"

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginContainer from '../../components/login/ui/LoginContainer';

export default function JapaneseLMSLogin() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  
  const [isDark, setIsDark] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'student'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  useEffect(() => {
    setIsVisible(true);
    
    // Redirect if already logged in
    if (user && !authLoading) {
       if (user.role === 'admin') {
         router.push('/dashboard');
       } else {
         router.push('/student/dashboard');
       }
    }
  }, [user, authLoading, router]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  interface FormData {
    email: string;
    password: string;
    rememberMe: boolean;
  }

  interface InputChangeEvent extends React.ChangeEvent<HTMLInputElement> {
    target: HTMLInputElement & {
      name: keyof FormData;
      value: string;
      type: string;
      checked: boolean;
    };
  }

  const handleInputChange = (e: InputChangeEvent): void => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  interface LoginSubmitEvent extends FormEvent<HTMLFormElement> {
    preventDefault(): void;
  }

  const handleSubmit = async (e: LoginSubmitEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Client-side validation
    if (!formData.email.trim()) {
      setError('Email harus diisi');
      setIsLoading(false);
      return;
    }
    
    if (!formData.password.trim()) {
      setError('Password harus diisi');
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await login(formData.email, formData.password, loginType);
      
      if (result.success) {
        // user will be updated via AuthContext, useEffect handles redirect
      } else {
        setError(result.message || 'Login gagal. Silakan periksa email dan password Anda.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer
      isDark={isDark}
      toggleTheme={toggleTheme}
      isVisible={isVisible}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      loginType={loginType}
      setLoginType={setLoginType as any}
      isLoading={isLoading}
      formData={formData}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      error={error}
    />
  );
}