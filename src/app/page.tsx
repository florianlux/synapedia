"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  Database,
  Upload,
  Sparkles,
  Shield,
  Network,
  Lock,
  ChevronDown,
  Github,
  Linkedin,
  Mail,
  CheckCircle,
  ArrowRight,
  Download,
} from "lucide-react";
import { SynapediaLogo } from "@/components/synapedia-logo";

/* ────────────────────────────────────────────────────────
   Fade-in wrapper — uses IntersectionObserver
   ──────────────────────────────────────────────────────── */
function FadeIn({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-fade-section transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   FAQ Accordion Item
   ──────────────────────────────────────────────────────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#00D4FF]/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[#E6F1FF] transition-colors hover:text-[#00D4FF]"
      >
        <span className="text-base font-medium">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#00D4FF]/60 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-[#A5F3FC]/70">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Glass Panel helper
   ──────────────────────────────────────────────────────── */
function Glass({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#00D4FF]/10 bg-[#0B1224]/60 backdrop-blur-md ${
        hover
          ? "transition-all duration-300 hover:border-[#00D4FF]/25 hover:shadow-[0_0_30px_rgba(0,212,255,0.08)] hover:-translate-y-1"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Static data
   ──────────────────────────────────────────────────────── */
const capabilities = [
  {
    icon: Database,
    title: "Structured Substance Database",
    desc: "Comprehensive pharmacological profiles with receptor bindings, risk levels, and evidence grading in a normalized relational schema.",
  },
  {
    icon: Upload,
    title: "Bulk Import Pipeline",
    desc: "Automated ingestion from PsychonautWiki, Wikidata, and PubChem with validation, deduplication, and conflict resolution.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Article Generator",
    desc: "LLM-assisted content drafting with structured templates, source attribution, and human-in-the-loop review workflows.",
  },
  {
    icon: Shield,
    title: "Harm-Reduction Framework",
    desc: "Risk classification system with interaction checking, contraindication warnings, and evidence-strength indicators.",
  },
  {
    icon: Network,
    title: "Explorer & Network Logic",
    desc: "Interactive receptor mapping, substance comparison tools, and pharmacological network visualization.",
  },
  {
    icon: Lock,
    title: "Secure Admin Dashboard",
    desc: "Token-protected editorial interface with article management, bulk operations, and content moderation tools.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "What is Synapedia?",
    a: "Synapedia is a structured scientific knowledge platform focused on psychoactive substances. It provides evidence-based pharmacological data, receptor profiles, and harm-reduction information for researchers, educators, and clinicians.",
  },
  {
    q: "Is this a medical advice platform?",
    a: "No. Synapedia is an educational resource for scientific literacy. It does not provide medical advice, dosage recommendations, or consumption guidance. Always consult qualified healthcare professionals.",
  },
  {
    q: "What data sources does Synapedia use?",
    a: "Data is aggregated from peer-reviewed literature, PsychonautWiki, Wikidata, PubChem, and curated expert contributions. All entries include source attribution and evidence-strength ratings.",
  },
  {
    q: "Is the platform open source?",
    a: "Synapedia is built on open-source technologies including Next.js, Supabase, and PostgreSQL. The core platform architecture supports community contributions and transparent development.",
  },
  {
    q: "How is data quality ensured?",
    a: "Every substance entry undergoes structured validation with evidence grading, source verification, and editorial review. The system separates established facts from preliminary research insights.",
  },
];

const roadmap = [
  {
    version: "v1",
    title: "Core Database",
    desc: "Substance profiles, receptor data, risk classification, and foundational search.",
  },
  {
    version: "v1.5",
    title: "Content Templates",
    desc: "AI-assisted article generation, MDX rendering, and structured editorial workflows.",
  },
  {
    version: "v2",
    title: "Network Explorer",
    desc: "Interactive brain mapping, pharmacological networks, and substance comparison tools.",
  },
  {
    version: "v2.5",
    title: "API Integrations",
    desc: "Public API endpoints, third-party data connectors, and research export capabilities.",
  },
];

/* ────────────────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="relative overflow-hidden bg-[#070B16] text-[#E6F1FF]">
      {/* Neural dots background */}
      <div className="landing-neural-bg pointer-events-none fixed inset-0 z-0" />

      {/* ═══ A) HERO ═══ */}
      <section className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center px-4 pb-20 pt-24 text-center">
        {/* Logo */}
        <div className="landing-logo-float mb-8">
          <div className="landing-logo-halo inline-flex items-center justify-center rounded-full p-6">
            <SynapediaLogo className="h-28 w-28 text-[#00D4FF] sm:h-36 sm:w-36 md:h-44 md:w-44" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          <span className="sr-only">Synapedia — </span>
          Connected Scientific Knowledge
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#A5F3FC]/70 sm:text-xl">
          A structured intelligence platform for pharmacological research —
          built for clarity, safety, and scale.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 rounded-full bg-[#00D4FF] px-7 py-3 text-sm font-semibold text-[#070B16] transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] hover:brightness-110"
          >
            Explore Substances
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#executive-summary"
            className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 px-7 py-3 text-sm font-semibold text-[#00D4FF] transition-all duration-300 hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5"
          >
            Read the One-Pager
          </a>
        </div>

        {/* Proof badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium uppercase tracking-wider text-[#A5F3FC]/50">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Evidence-informed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Structured Database
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Harm-Reduction First
          </span>
        </div>
      </section>

      {/* ═══ B) EXECUTIVE SUMMARY ═══ */}
      <section
        id="executive-summary"
        className="relative z-10 px-4 py-24 sm:py-32"
      >
        <FadeIn className="mx-auto max-w-3xl">
          <Glass className="p-8 sm:p-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              Executive Summary
            </p>
            <h2 className="mb-8 text-2xl font-bold sm:text-3xl">
              Bridging the Knowledge Gap
            </h2>
            <div className="space-y-5 text-sm leading-relaxed text-[#A5F3FC]/70 sm:text-base">
              <p>
                <strong className="text-[#E6F1FF]">The Problem:</strong>{" "}
                Pharmacological information about psychoactive substances is
                scattered, inconsistent, and often lacks scientific rigor.
                Researchers, educators, and harm-reduction professionals struggle
                to access structured, evidence-based data in one place.
              </p>
              <p>
                <strong className="text-[#E6F1FF]">The Solution:</strong>{" "}
                Synapedia aggregates, normalizes, and structures pharmacological
                knowledge into a unified platform. Every substance profile
                includes receptor bindings, risk classifications, interaction
                data, and evidence-strength ratings — all within a secure,
                scalable architecture.
              </p>
              <p>
                <strong className="text-[#E6F1FF]">The Vision:</strong> A living
                scientific knowledge network that grows with research, connects
                pharmacological data points, and serves as the foundational
                infrastructure for evidence-based education and harm reduction.
              </p>
            </div>
          </Glass>
        </FadeIn>
      </section>

      {/* ═══ C) CAPABILITIES ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              Platform Capabilities
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Built for Depth &amp; Scale
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => (
              <Glass key={cap.title} hover className="p-6 sm:p-8">
                <cap.icon className="mb-4 h-8 w-8 text-[#00D4FF]" />
                <h3 className="mb-2 text-lg font-semibold">{cap.title}</h3>
                <p className="text-sm leading-relaxed text-[#A5F3FC]/60">
                  {cap.desc}
                </p>
              </Glass>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ═══ D) ARCHITECTURE ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              Technical Architecture
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Modern Stack, Proven Foundations
            </h2>
          </div>

          <Glass className="p-8 sm:p-12">
            {/* Tech stack pills */}
            <div className="mb-10">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#A5F3FC]/50">
                Core Stack
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  "Next.js",
                  "TypeScript",
                  "Supabase",
                  "PostgreSQL",
                  "Row-Level Security",
                  "AI Integration",
                  "MDX",
                  "Tailwind CSS",
                ].map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-1.5 text-xs font-medium text-[#00D4FF]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Data flow */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#A5F3FC]/50">
                Data Pipeline
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                <span className="rounded-lg bg-[#1EE6C1]/10 px-4 py-2 text-[#1EE6C1]">
                  Import
                </span>
                <ArrowRight className="h-4 w-4 text-[#A5F3FC]/30" />
                <span className="rounded-lg bg-[#1EE6C1]/10 px-4 py-2 text-[#1EE6C1]">
                  Normalize
                </span>
                <ArrowRight className="h-4 w-4 text-[#A5F3FC]/30" />
                <span className="rounded-lg bg-[#1EE6C1]/10 px-4 py-2 text-[#1EE6C1]">
                  Validate
                </span>
                <ArrowRight className="h-4 w-4 text-[#A5F3FC]/30" />
                <span className="rounded-lg bg-[#1EE6C1]/10 px-4 py-2 text-[#1EE6C1]">
                  Publish
                </span>
              </div>
            </div>
          </Glass>
        </FadeIn>
      </section>

      {/* ═══ E) SAFETY & QUALITY ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              Quality Principles
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Safety &amp; Scientific Integrity
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Evidence-First Mindset",
                desc: "Every data point is graded by evidence strength. Peer-reviewed sources take priority, and speculative information is clearly separated from established findings.",
              },
              {
                title: "Facts & Insights Separation",
                desc: "Structured editorial framework that distinguishes verified pharmacological data from preliminary research, expert opinion, and anecdotal reports.",
              },
              {
                title: "Risk-Awareness Framework",
                desc: "Integrated risk classification with interaction warnings, contraindication checks, and transparent uncertainty communication for responsible information access.",
              },
            ].map((card) => (
              <Glass key={card.title} hover className="p-6 sm:p-8">
                <Shield className="mb-4 h-7 w-7 text-[#1EE6C1]" />
                <h3 className="mb-2 text-lg font-semibold">{card.title}</h3>
                <p className="text-sm leading-relaxed text-[#A5F3FC]/60">
                  {card.desc}
                </p>
              </Glass>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ═══ F) FOUNDER / DEVELOPER ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-3xl">
          <Glass className="p-8 sm:p-12">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              {/* Founder image placeholder */}
              <div className="shrink-0">
                <div className="landing-founder-glow flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1224] to-[#00D4FF]/10 text-3xl font-bold text-[#00D4FF]/80 sm:h-48 sm:w-48">
                  FL
                </div>
              </div>

              {/* Text */}
              <div className="text-center md:text-left">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/50">
                  Founder &amp; Developer
                </p>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                  Florian Lux
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-[#A5F3FC]/70 sm:text-base">
                  Software engineer with deep expertise in systems architecture
                  and data-driven platforms. Passionate about building structured
                  information systems that make complex scientific knowledge
                  accessible, transparent, and actionable — at the intersection
                  of technology, medical education, and scalable knowledge
                  infrastructure.
                </p>

                {/* Social links */}
                <div className="mb-6 flex items-center justify-center gap-4 md:justify-start">
                  <a
                    href="https://www.linkedin.com/in/florianlux"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#A5F3FC]/40 transition-colors hover:text-[#00D4FF]"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://github.com/florianlux"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#A5F3FC]/40 transition-colors hover:text-[#00D4FF]"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href="mailto:contact@synapedia.com"
                    className="text-[#A5F3FC]/40 transition-colors hover:text-[#00D4FF]"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </div>

                {/* Quote */}
                <blockquote className="border-l-2 border-[#00D4FF]/20 pl-4 text-sm italic text-[#A5F3FC]/50">
                  &ldquo;Knowledge should be structured, transparent, and
                  connected.&rdquo;
                </blockquote>
              </div>
            </div>
          </Glass>
        </FadeIn>
      </section>

      {/* ═══ G) ROADMAP ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-3xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              Development Roadmap
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Building in Phases
            </h2>
          </div>
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#00D4FF]/30 via-[#1EE6C1]/20 to-transparent sm:left-[23px]" />

            {roadmap.map((phase, i) => (
              <div key={phase.version} className="relative flex gap-6 pb-10">
                {/* Dot */}
                <div
                  className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold sm:h-12 sm:w-12 sm:text-sm ${
                    i === 0
                      ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "border-[#A5F3FC]/15 bg-[#0B1224] text-[#A5F3FC]/50"
                  }`}
                >
                  {phase.version}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{phase.title}</h3>
                  <p className="mt-1 text-sm text-[#A5F3FC]/60">
                    {phase.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ═══ H) FAQ ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-2xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4FF]/60">
              FAQ
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>
          <Glass className="px-6 py-2 sm:px-8">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </Glass>
        </FadeIn>
      </section>

      {/* ═══ I) FINAL CTA ═══ */}
      <section className="relative z-10 px-4 py-24 sm:py-32">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            Build a Living Research Network
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-[#A5F3FC]/60">
            Join the foundation of structured, transparent pharmacological
            knowledge.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 rounded-full bg-[#00D4FF] px-7 py-3 text-sm font-semibold text-[#070B16] transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] hover:brightness-110"
            >
              Explore Substances
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 px-7 py-3 text-sm font-semibold text-[#00D4FF] transition-all duration-300 hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5"
            >
              Open Dashboard
            </Link>
          </div>
          <div className="mt-6">
          <span
              className="inline-flex items-center gap-2 text-sm text-[#A5F3FC]/30 cursor-default"
              title="PDF coming soon"
            >
              <Download className="h-4 w-4" />
              Download One-Pager (PDF)
            </span>
          </div>
        </FadeIn>
      </section>

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
}
