import React, { useEffect, useState } from "react";
import Head from "next/head";
import Footer from "@/components/Footer";
import { configService } from "@/lib/api/configService";
import { FAQ } from "@/lib/types/config.types";
import { useConfig } from "@/lib/context/ConfigContext";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQPage() {
  const { settings } = useConfig();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  useEffect(() => {
    configService.getPublicFAQs()
      .then((res) => {
        setFaqs(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load FAQs", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Head>
        <title>Frequently Asked Questions | {settings?.general?.platformName || "Stitch"}</title>
      </Head>

      <main className="flex-1 pt-[calc(var(--h-main-nav)+3rem)] pb-24">
        <div className="max-w-2xl mx-auto px-6">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-display font-light text-stone-900 mb-4">Frequently Asked Questions</h1>
            <div className="w-12 h-[1px] bg-stone-300 mx-auto mb-6"></div>
            <p className="text-sm text-stone-500">
              Find answers to common questions about orders, shipping, and returns. 
              Can't find what you're looking for? <a href={`mailto:${settings?.general?.supportEmail || "support@stitch.com"}`} className="text-stone-900 underline underline-offset-2">Contact our team</a>.
            </p>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-sm">
              No FAQs available at the moment.
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div key={idx} className="border border-stone-200 bg-white">
                    <button
                      onClick={() => toggle(idx)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none"
                    >
                      <span className="font-semibold text-stone-900 text-sm pr-4">{faq.question}</span>
                      <div className={`shrink-0 h-6 w-6 flex items-center justify-center rounded-full transition-colors ${isOpen ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"}`}>
                        {isOpen ? <Minus size={12} /> : <Plus size={12} />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-1 text-sm text-stone-500 leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
