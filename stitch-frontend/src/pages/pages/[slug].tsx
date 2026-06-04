import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Footer from "@/components/Footer";
import { configService } from "@/lib/api/configService";
import { useConfig } from "@/lib/context/ConfigContext";

export default function DynamicContentPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { settings } = useConfig();
  
  const [page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    
    setIsLoading(true);
    configService.getContentBySlug(slug as string)
      .then((data) => {
        setPage(data);
        setError(false);
      })
      .catch((err) => {
        console.error("Failed to load page content", err);
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-stone-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-stone-50">
        <h1 className="text-3xl font-display text-stone-900 mb-2">Page Not Found</h1>
        <p className="text-stone-500 mb-6 text-sm">The content you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-stone-900 text-stone-50 text-[11px] tracking-widest uppercase hover:bg-stone-800 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Head>
        <title>{page.metaTitle || page.title} | {settings?.general?.platformName || "Stitch"}</title>
        <meta name="description" content={page.metaDescription || page.title} />
      </Head>

      <main className="flex-1 pt-[calc(var(--h-main-nav)+3rem)] pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-display font-light text-stone-900 mb-4">{page.title}</h1>
            <div className="w-12 h-[1px] bg-stone-300 mx-auto"></div>
          </header>

          <div 
            className="prose prose-stone prose-sm sm:prose-base mx-auto prose-headings:font-display prose-headings:font-light prose-a:text-stone-900 prose-a:underline-offset-2 hover:prose-a:text-stone-600 prose-p:leading-relaxed prose-img:rounded-md"
            dangerouslySetInnerHTML={{ __html: page.htmlBody || page.body || page.content || "" }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
