import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { FpjsProvider } from '@fingerprintjs/fingerprintjs-pro-react';
import "./globals.css";

export const metadata: Metadata = {
  title: "学習管理システム - Japanese Learning Management System | Learn Japanese Online",
  description: "Master Japanese language and culture with our comprehensive learning management system. Interactive lessons, cultural studies, and expert guidance for all levels.",
  keywords: ["Japanese learning", "language learning", "Japanese culture", "LMS", "online education", "gengo", "bunka"],
  authors: [{ name: "Japanese Learning Management System" }],
  creator: "Japanese LMS",
  publisher: "Japanese LMS",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://japanese-lms.com',
    title: 'Japanese Learning Management System - Learn Japanese Online',
    description: 'Master Japanese language and culture with our comprehensive learning platform',
    siteName: 'Japanese LMS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Japanese Learning Management System',
    description: 'Master Japanese language and culture with our comprehensive learning platform',
    creator: '@japaneseLMS',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Japanese Learning Management System",
    "description": "Master Japanese language and culture with our comprehensive learning management system",
    "url": "https://japanese-lms.com",
    "sameAs": [
      "https://twitter.com/japaneseLMS",
      "https://facebook.com/japaneseLMS"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["English", "Japanese"]
    },
    "educationalCredentialAwarded": "Japanese Language Certificate",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Japanese Language Courses",
      "itemListElement": [
        {
          "@type": "Course",
          "name": "Japanese Language (Gengo)",
          "description": "Comprehensive Japanese language learning including grammar, vocabulary, and conversation"
        },
        {
          "@type": "Course", 
          "name": "Japanese Culture (Bunka)",
          "description": "Explore Japanese culture, traditions, and modern society"
        }
      ]
    }
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <meta name="theme-color" content="#dc2626" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        className="antialiased transition-colors duration-300"
      >
        <FpjsProvider
          loadOptions={{
            apiKey: "N0el3l9IyAg5dYzK7nTE",
            region: "ap"
          }}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </FpjsProvider>
      </body>
    </html>
  );
}
