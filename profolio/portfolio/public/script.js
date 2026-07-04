document.addEventListener("DOMContentLoaded", () => {

  /* ── 1. Sticky Header Header Effects ── */
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  /* ── 2. Mobile Nav Menu Toggle ── */
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link, .nav-cta");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    // Close menu when links are clicked
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        menuToggle.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });
  }

  /* ── 3. Typing Text Animation ── */
  const typingElement = document.getElementById("typingText");
  const phrases = ["Full Stack Developer", "BCA Student", "Freelancer"];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function type() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 50; // Delete speed
    } else {
      typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 100; // Type speed
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause at the end of the phrase
      typingSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 500; // Pause before typing next word
    }

    setTimeout(type, typingSpeed);
  }

  if (typingElement) {
    type();
  }

  /* ── 4. Stat Counter Count-up Animation ── */
  const counters = document.querySelectorAll(".stat-numberCounter");

  const animateCounter = (counter) => {
    const target = +counter.getAttribute("data-target");
    const duration = 1500; // Duration of animation in ms
    const increment = target / (duration / 16); // 60 FPS

    let count = 0;

    const updateCount = () => {
      count += increment;
      if (count < target) {
        counter.textContent = Math.ceil(count);
        requestAnimationFrame(updateCount);
      } else {
        counter.textContent = target;
      }
    };

    updateCount();
  };

  /* ── 5. Scroll Intersection Observer for Elements & Counters ── */
  const observerOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: "0px"
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add scroll animation reveal trigger class
        entry.target.classList.add("active");

        // Trigger stat counters if present
        const counterElements = entry.target.querySelectorAll(".stat-numberCounter");
        if (counterElements.length > 0) {
          counterElements.forEach(counter => {
            if (!counter.classList.contains("animated")) {
              counter.classList.add("animated");
              animateCounter(counter);
            }
          });
        }

        // Unobserve after showing to avoid repeat trigger
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Register section reveal selectors
  const scrollElements = document.querySelectorAll(".scroll-reveal");
  scrollElements.forEach(el => observer.observe(el));

  /* ── 6. Contact Form AJAX Submission ── */
  const contactForm = document.getElementById("contactForm");
  const formAlert = document.getElementById("formAlert");
  const formSubmitBtn = document.getElementById("formSubmitBtn");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("formName").value.trim();
      const email = document.getElementById("formEmail").value.trim();
      const subject = document.getElementById("formSubject").value.trim();
      const message = document.getElementById("formMessage").value.trim();

      // Reset alert state
      formAlert.style.display = "none";
      formAlert.className = "form-alert";

      formSubmitBtn.disabled = true;
      formSubmitBtn.textContent = "Sending Message...";

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (response.ok) {
          formAlert.textContent = data.message || "Message sent successfully!";
          formAlert.classList.add("success");
          formAlert.style.display = "block";
          contactForm.reset();
        } else {
          formAlert.textContent = data.error || "An error occurred. Please try again.";
          formAlert.classList.add("error");
          formAlert.style.display = "block";
        }
      } catch (error) {
        console.error("AJAX Error:", error);
        formAlert.textContent = "Connection error. Please try again later.";
        formAlert.classList.add("error");
        formAlert.style.display = "block";
      }

      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = "Send Message";
    });
  }
});
