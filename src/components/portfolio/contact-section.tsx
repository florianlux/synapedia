"use client";

import { contactContent } from "@/content/portfolio";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";

const iconMap = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
} as const;

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <motion.h2
          className="mb-6 text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {contactContent.heading}
        </motion.h2>

        <motion.p
          className="mb-8 text-neutral-400"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {contactContent.note}
        </motion.p>

        <motion.a
          href={`mailto:${contactContent.email}`}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-neutral-950"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Mail className="h-4 w-4" />
          {contactContent.email}
        </motion.a>

        <motion.div
          className="mt-8 flex justify-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {contactContent.socials.map((social) => {
            const Icon = iconMap[social.icon];
            return (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="rounded-full border border-white/10 bg-white/5 p-3 text-neutral-400 transition-all hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
