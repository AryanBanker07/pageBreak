import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://pagebreak.app";
const SITE_NAME = "PageBreak";
const SITE_TITLE = "PageBreak — Fix Sliced Page Breaks in Apple Notes PDFs";
const SITE_DESCRIPTION =
  "Free online tool to fix Apple Notes PDF exports that slice through handwritten text and images. Upload your continuous PDF or long screenshot and get perfectly paginated A4/Letter output — 100% client-side, private, no uploads.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0066FF",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "PDF page break",
    "Apple Notes export fix",
    "iPad notes PDF",
    "handwritten notes PDF",
    "PDF splitter",
    "page break detector",
    "whitespace detection",
    "fix sliced PDF",
    "continuous PDF to pages",
    "Apple Notes page break",
    "iPad handwriting PDF",
    "PDF pagination tool",
    "screenshot to PDF",
    "long screenshot PDF",
    "client-side PDF tool",
    "free PDF converter",
    "Apple Notes to A4",
    "Apple Notes to Letter",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PageBreak — Fix sliced page breaks in Apple Notes PDF exports",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description:
      "Fix Apple Notes PDF exports that cut through your handwriting. Free, private, runs entirely in your browser.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "Technology",
  classification: "Productivity Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD Structured Data — WebApplication + SoftwareApplication
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    browserRequirements: "Requires a modern browser with HTML5 Canvas support",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Fix sliced page breaks in Apple Notes PDF exports",
      "Smart whitespace detection with adjustable sensitivity",
      "Supports any text/background color combination",
      "A4 and US Letter page size output",
      "100% client-side processing — files never leave your device",
      "Supports PDF, PNG, JPG, and WebP inputs",
      "Preview page breaks before downloading",
    ],
    screenshot: `${SITE_URL}/og-image.png`,
    softwareHelp: {
      "@type": "WebContent",
      url: SITE_URL,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Why does Apple Notes cut through my handwriting when exporting to PDF?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Apple Notes exports handwritten content as a continuous document and inserts page breaks at fixed intervals without analyzing the content. This often results in text, drawings, and images being sliced in half at page boundaries. PageBreak fixes this by intelligently detecting whitespace gaps between your content lines.",
        },
      },
      {
        "@type": "Question",
        name: "Is my data safe? Does PageBreak upload my files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, your data is completely safe. PageBreak processes everything 100% in your browser using client-side JavaScript. Your PDF and image files are never uploaded to any server. No data ever leaves your device.",
        },
      },
      {
        "@type": "Question",
        name: "What file formats does PageBreak support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PageBreak accepts PDF files and image formats including PNG, JPG/JPEG, and WebP. You can upload a multi-page continuous PDF exported from Apple Notes, or a long screenshot of your handwritten notes.",
        },
      },
      {
        "@type": "Question",
        name: "Does PageBreak work with dark mode or colored backgrounds?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. PageBreak uses a color-agnostic variance-based detection algorithm that works with any text color on any background color, including dark mode notes, colored stationery, and documents with embedded images.",
        },
      },
      {
        "@type": "Question",
        name: "Is PageBreak free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, PageBreak is completely free. There are no usage limits, no sign-up required, and no watermarks on the output PDF.",
        },
      },
    ],
  };

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
