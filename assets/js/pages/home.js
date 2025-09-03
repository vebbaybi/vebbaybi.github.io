export async function render(target) {
  if (!target) return;
  target.setAttribute('aria-busy', 'true');

  const heroImg = '/assets/images/thedev.webp'; 

  target.innerHTML = `
    <section class="home-hero">
      <div class="hero-left">
        <img class="hero-img" src="${heroImg}" alt="Portrait" loading="eager" />
      </div>
      <div class="hero-right">
        <div class="hero-content">
          <span class="eyebrow">Welcome to My Portfolio Page</span>
          <h1 class="hero-title">My<br/>Portfolio</h1>
          <p class="hero-sub">
            I build AI systems, robotics, and sturdy things in the real world.
            Explore selected work across software, web3, and construction.
          </p>
          <div class="hero-ctas">
            <a class="btn" href="#/projects">Explore Now</a>
            <a class="btn secondary" href="#/resumes">
              <span class="play" aria-hidden="true"></span> HIRE WEBBABY
            </a>
          </div>
        </div>
      </div>
      <div class="page-index">Page | 01</div>
    </section>
  `;

  target.removeAttribute('aria-busy');
}
