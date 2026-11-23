(() => {
  "use strict";
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  let installPrompt = null;

  function showInstallBanner() {
    if (isStandalone() || document.getElementById("lp-install-banner")) return;
    const banner = document.createElement("aside");
    banner.id = "lp-install-banner";
    banner.className = "lp-install-banner";
    banner.setAttribute("aria-label", "Install Lucky Praditya Admin App");
    banner.innerHTML = '<div><strong>Lucky Praditya Admin</strong><span>Install for quicker access to Control Center</span></div><button type="button" data-install>Install</button><button type="button" data-dismiss aria-label="Dismiss">×</button>';
    document.body.append(banner);
    banner.querySelector("[data-install]").addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      banner.remove();
    });
    banner.querySelector("[data-dismiss]").addEventListener("click", () => banner.remove());
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js", {
          scope: "./",
          updateViaCache: "none"
        });
        registration.update().catch(() => {});
      } catch (error) {
        console.error("Admin service worker registration failed:", error);
      }
    }, { once: true });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    showInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    document.getElementById("lp-install-banner")?.remove();
  });
})();