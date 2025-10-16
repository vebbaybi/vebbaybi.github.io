// /assets/js/pages/contact.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#form-status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";
    status.style.color = "var(--text-muted)";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      // Example async mock (replace with actual endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      form.reset();
      status.textContent = "✅ Message sent successfully!";
      status.style.color = "var(--blue-400)";
    } catch (err) {
      status.textContent = "❌ Failed to send. Please try again later.";
      status.style.color = "var(--tan-600)";
    }
  });
});
