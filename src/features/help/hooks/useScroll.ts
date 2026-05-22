import { useEffect } from "react";

export const useScroll = (sections: string[]) => {
  useEffect(() => {
    const scrollToHashSection = () => {
      const sectionId = window.location.hash.replace("#", "");
      if (!sectionId) {
        return;
      }

      const section = document.getElementById(sectionId);
      if (!section) {
        return;
      }

      window.requestAnimationFrame(() => {
        section.scrollIntoView({ block: "start" });
      });
    };

    scrollToHashSection();
    window.addEventListener("hashchange", scrollToHashSection);

    return () => window.removeEventListener("hashchange", scrollToHashSection);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const sectionId = sections[i];
        const element = document.getElementById(sectionId);
        if (element && element.offsetTop <= scrollPosition) {
          window.history.replaceState(null, "", `/docs/olsr#${sectionId}`);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);
};
