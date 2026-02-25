"use client";

import { heroContent } from "@/content/portfolio";
import { ParticleField } from "./particle-field";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      {/* Background layers */}
      <div className="portfolio-bg absolute inset-0" />
      <ParticleField />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <motion.h1
          className="text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {heroContent.name}
        </motion.h1>

        {/* Animated underline */}
        <motion.div
          className="h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: "8rem" }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        />

        <motion.p
          className="max-w-lg text-base text-neutral-400 sm:text-lg md:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {heroContent.tagline}
        </motion.p>

        <motion.div
          className="mt-4 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {heroContent.cta.map((btn) => (
            <a
              key={btn.href}
              href={btn.href}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-white/5 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-neutral-950"
            >
              {btn.label}
            </a>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-neutral-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <span className="text-xs tracking-widest uppercase">
          {heroContent.scrollIndicatorLabel}
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}
