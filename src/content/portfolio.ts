// ╔══════════════════════════════════════════════════════════════════╗
// ║  EDIT HERE – All portfolio content lives in this single file.  ║
// ║  Change any text below and the page updates automatically.     ║
// ╚══════════════════════════════════════════════════════════════════╝

export const siteConfig = {
  name: "Florian Lux",
  title: "Florian Lux – Creative Technologist & Researcher",
  description:
    "Portfolio of Florian Lux — Creative Technologist blending research-driven design with modern engineering.",
  url: "https://florianlux.com",
  ogImage: "/og-portfolio.png",
};

export const heroContent = {
  name: "Florian Lux",
  tagline: "Creative Technologist • Research-Driven Design",
  cta: [
    { label: "View Projects", href: "#projects" },
    { label: "Contact", href: "#contact" },
  ],
  scrollIndicatorLabel: "Scroll to explore",
};

export const aboutContent = {
  heading: "About",
  bio: `I'm a creative technologist working at the intersection of research and product. With a background that spans machine learning, interface design, and full-stack engineering, I build systems that turn complex ideas into clear, impactful experiences. My work is driven by curiosity, precision, and a commitment to evidence-based thinking.`,
  focusAreas: [
    "Machine Learning",
    "Interface Design",
    "Data Visualization",
    "Scientific Communication",
    "Full-Stack Engineering",
    "Open Source",
  ],
};

export const skillsContent = {
  heading: "Skills",
  groups: [
    {
      title: "Engineering",
      items: [
        "TypeScript",
        "React / Next.js",
        "Node.js",
        "Python",
        "PostgreSQL",
        "REST & GraphQL",
      ],
    },
    {
      title: "Research",
      items: [
        "Machine Learning",
        "NLP",
        "Statistical Analysis",
        "Data Pipelines",
        "Experiment Design",
        "Scientific Writing",
      ],
    },
    {
      title: "Design",
      items: [
        "UI / UX Design",
        "Design Systems",
        "Figma",
        "Data Visualization",
        "Motion Design",
        "Accessibility",
      ],
    },
    {
      title: "Product",
      items: [
        "Product Strategy",
        "Agile / Scrum",
        "User Research",
        "A/B Testing",
        "Technical Writing",
        "Team Leadership",
      ],
    },
  ],
};

export const projectsContent = {
  heading: "Projects",
  items: [
    {
      title: "Synapedia",
      description:
        "Evidence-based knowledge platform for psychoactive substances with pharmacology focus.",
      tags: ["Next.js", "Supabase", "MDX"],
      liveUrl: "https://synapedia.com",
      githubUrl: "https://github.com/florianlux/synapedia",
    },
    {
      title: "NeuroVis",
      description:
        "Interactive 3D brain receptor visualization for educational research.",
      tags: ["Three.js", "React", "WebGL"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "DataForge",
      description:
        "Real-time data pipeline dashboard with anomaly detection and alerting.",
      tags: ["Python", "FastAPI", "React"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "SynthLab",
      description:
        "Generative audio experiment combining ML models with browser-based synthesis.",
      tags: ["TensorFlow.js", "Web Audio", "TypeScript"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "PaperTrail",
      description:
        "Academic paper recommendation engine using citation graph analysis.",
      tags: ["Python", "Neo4j", "NLP"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "SpectrumUI",
      description:
        "Accessible component library with built-in WCAG compliance testing.",
      tags: ["React", "Storybook", "A11y"],
      liveUrl: "#",
      githubUrl: "#",
    },
  ],
};

export const experienceContent = {
  heading: "Experience",
  items: [
    {
      role: "Senior Creative Technologist",
      company: "Research Lab Berlin",
      period: "2022 – Present",
      bullets: [
        "Led development of interactive scientific visualization tools used by 50k+ researchers.",
        "Architected a modular design system adopted across four product teams.",
        "Published two papers on human-computer interaction in peer-reviewed journals.",
      ],
    },
    {
      role: "Full-Stack Engineer",
      company: "Digital Studio Munich",
      period: "2019 – 2022",
      bullets: [
        "Built real-time data dashboards processing 2M+ events daily.",
        "Designed and shipped a customer-facing analytics product from concept to launch.",
        "Mentored junior engineers and established code review practices.",
      ],
    },
    {
      role: "Research Assistant",
      company: "Technical University of Munich",
      period: "2017 – 2019",
      bullets: [
        "Developed NLP models for biomedical text classification.",
        "Contributed to an open-source toolkit for scientific data processing.",
      ],
    },
  ],
};

export const contactContent = {
  heading: "Get in Touch",
  note: "I'm always open to interesting conversations, collaborations, or new opportunities. Feel free to reach out.",
  email: "hello@florianlux.com",
  socials: [
    {
      label: "GitHub",
      url: "https://github.com/florianlux",
      icon: "github" as const,
    },
    {
      label: "LinkedIn",
      url: "https://linkedin.com/in/florianlux",
      icon: "linkedin" as const,
    },
    {
      label: "Email",
      url: "mailto:hello@florianlux.com",
      icon: "mail" as const,
    },
  ],
};

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];
