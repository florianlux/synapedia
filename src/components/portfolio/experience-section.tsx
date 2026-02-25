"use client";

import { experienceContent } from "@/content/portfolio";
import { motion } from "framer-motion";

export function ExperienceSection() {
  return (
    <section id="experience" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          className="mb-12 text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {experienceContent.heading}
        </motion.h2>

        <div className="relative space-y-10 border-l border-white/10 pl-8">
          {experienceContent.items.map((item, i) => (
            <motion.div
              key={`${item.company}-${item.period}`}
              className="relative"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {/* Timeline dot */}
              <div className="absolute -left-[calc(2rem+4.5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-cyan-500 bg-neutral-950" />

              <p className="mb-1 text-sm text-neutral-500">{item.period}</p>
              <h3 className="text-lg font-semibold text-white">{item.role}</h3>
              <p className="mb-3 text-sm text-neutral-400">{item.company}</p>

              <ul className="space-y-1.5">
                {item.bullets.map((bullet, j) => (
                  <li
                    key={j}
                    className="text-sm leading-relaxed text-neutral-400"
                  >
                    <span className="mr-2 text-cyan-600">▸</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
