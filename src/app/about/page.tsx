"use client";

import { useEffect } from "react";
import { PortfolioNav } from "@/components/portfolio/portfolio-nav";
import { Hero } from "@/components/portfolio/hero";
import { AboutSection } from "@/components/portfolio/about-section";
import { SkillsSection } from "@/components/portfolio/skills-section";
import { ProjectsSection } from "@/components/portfolio/projects-section";
import { ExperienceSection } from "@/components/portfolio/experience-section";
import { ContactSection } from "@/components/portfolio/contact-section";
import { ThemeControls } from "@/components/portfolio/theme-controls";
import { PortfolioFooter } from "@/components/portfolio/portfolio-footer";

export default function AboutPage() {
  useEffect(() => {
    // Hide the Synapedia root header/footer on the portfolio page
    const header = document.querySelector<HTMLElement>("body > header");
    const footer = document.querySelector<HTMLElement>("body > footer");
    const main = document.querySelector<HTMLElement>("body > main");

    if (header) header.style.display = "none";
    if (footer) footer.style.display = "none";
    if (main) main.style.minHeight = "0";

    return () => {
      if (header) header.style.display = "";
      if (footer) footer.style.display = "";
      if (main) main.style.minHeight = "";
    };
  }, []);

  return (
    <>
      <PortfolioNav />
      <ThemeControls />
      <Hero />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ExperienceSection />
      <ContactSection />
      <PortfolioFooter />
    </>
  );
}
