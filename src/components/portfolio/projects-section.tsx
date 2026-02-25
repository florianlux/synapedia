"use client";

import { projectsContent } from "@/content/portfolio";
import { motion } from "framer-motion";
import { ExternalLink, Github } from "lucide-react";

export function ProjectsSection() {
  return (
    <section id="projects" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.h2
          className="mb-12 text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {projectsContent.heading}
        </motion.h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projectsContent.items.map((project, i) => (
            <motion.article
              key={project.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <h3 className="mb-2 text-lg font-semibold text-white">
                {project.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-neutral-400">
                {project.description}
              </p>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white focus:outline-none focus:text-white"
                    aria-label={`Live demo of ${project.title}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Live
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white focus:outline-none focus:text-white"
                    aria-label={`GitHub repository for ${project.title}`}
                  >
                    <Github className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
