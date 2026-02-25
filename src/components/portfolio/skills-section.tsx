"use client";

import { skillsContent } from "@/content/portfolio";
import { motion } from "framer-motion";

export function SkillsSection() {
  return (
    <section id="skills" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.h2
          className="mb-12 text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {skillsContent.heading}
        </motion.h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {skillsContent.groups.map((group, i) => (
            <motion.div
              key={group.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <h3 className="mb-4 text-lg font-semibold text-white">
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white/5 px-3 py-1 text-sm text-neutral-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
