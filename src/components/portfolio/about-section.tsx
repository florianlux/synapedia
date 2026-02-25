"use client";

import { aboutContent } from "@/content/portfolio";
import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          className="mb-8 text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {aboutContent.heading}
        </motion.h2>

        <motion.p
          className="mb-8 text-base leading-relaxed text-neutral-400 sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {aboutContent.bio}
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {aboutContent.focusAreas.map((area) => (
            <span
              key={area}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-300"
            >
              {area}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
