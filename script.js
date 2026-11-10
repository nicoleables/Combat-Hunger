// ===================================
// DONATION AMOUNT BUTTONS
// ===================================

const amountButtons = document.querySelectorAll(".amount-button");
const donationMessage = document.querySelector("#donation-message");

amountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    amountButtons.forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");

    const amount = button.dataset.amount;

    if (amount === "0") {
      donationMessage.textContent =
        "You selected Other Amount. Every contribution makes a difference!";
    } else {
      donationMessage.textContent =
        `You selected a $${amount} donation. Thank you for supporting veterans!`;
    }
  });
});


// ===================================
// SUPABASE CONNECTION
// ===================================

const SUPABASE_URL = "https://kvtwgwvycxsffysnwtqa.supabase.co";
const SUPABASE_KEY = "sb_publishable_fqv4Vy8q_iLpbwfIY34nqg_FsRof_LJ";


// ===================================
// LOAD EVENTS FROM SUPABASE
// ===================================

async function loadEvents() {
  const eventsList = document.querySelector("#events-list");

  // Only run this section on the Events page.
  if (!eventsList) return;

  if (!window.supabase ||
      SUPABASE_URL.includes("PASTE_") ||
      SUPABASE_KEY.includes("PASTE_")) {
    console.warn("Supabase information has not been added yet.");
    eventsList.textContent = "Events are temporarily unavailable.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data: events, error } = await client
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Could not load events:", error.message);
    eventsList.textContent = "Events are temporarily unavailable.";
    return;
  }

  eventsList.innerHTML = "";

  if (!events || events.length === 0) {
    eventsList.textContent = "There are no upcoming events at this time.";
    return;
  }

  events.forEach((event) => {
    const card = document.createElement("section");
    card.className = "event-card";

    const addText = (tag, className, value) => {
      if (!value) return null;

      const element = document.createElement(tag);
      element.className = className;
      element.textContent = value;
      card.appendChild(element);

      return element;
    };

    // Event label
    addText(
      "p",
      "event-label",
      event.event_label || "UPCOMING EVENT"
    );

    // Optional event image
    if (event.image_url) {
      const image = document.createElement("img");
      image.src = event.image_url;
      image.alt = event.title || "Event photo";
      image.className = "event-image";
      card.appendChild(image);
    }

    // Event time
    addText("p", "event-date", event.event_time);

    // Event date and year
    if (event.event_date) {
      const date = new Date(event.event_date + "T12:00:00");

      const day = date.getDate();
      const suffix =
        day % 10 === 1 && day !== 11 ? "st" :
        day % 10 === 2 && day !== 12 ? "nd" :
        day % 10 === 3 && day !== 13 ? "rd" : "th";

      const weekday = date.toLocaleDateString("en-US", {
        weekday: "long"
      });

      const month = date.toLocaleDateString("en-US", {
        month: "long"
      });

      const dateText = `${weekday}, ${month} ${day}${suffix}, ${date.getFullYear()}`;

      addText("p", "event-day", dateText);
    }

    // Organization and introduction
    const presenterText = [
      event.organization,
      event.event_introduction
    ].filter(Boolean).join(" ");

    addText("p", "event-presenter", presenterText);

    // Event title
    addText("h2", "", event.title);

    // Event description
    addText("p", "event-description", event.description);

    // Underwriting message
    addText(
      "p",
      "event-underwriting",
      event.underwriting_message
    );

    // Additional details
    addText("p", "event-details", event.additional_details);

    // Optional location
    addText("p", "event-location", event.location);

    // Optional registration link
    if (event.registration_url) {
      const registrationLink = document.createElement("a");
      registrationLink.href = event.registration_url;
      registrationLink.className = "donate-button";
      registrationLink.textContent = "Learn More / Register";
      registrationLink.target = "_blank";
      registrationLink.rel = "noopener noreferrer";
      card.appendChild(registrationLink);
    }

    // Donation button
    const donateLink = document.createElement("a");
    donateLink.href = "donate.html";
    donateLink.className = "donate-button";
    donateLink.textContent = "Can't Attend? Make a Donation Instead";
    card.appendChild(donateLink);

    eventsList.appendChild(card);
  });
}

loadEvents();


// ===================================
// LOAD ALL DONATE PAGE CONTENT
// ===================================
async function loadDonatePage() {
  const pageContent = document.querySelector("#donate-page-content");

  // Only run on the Donate page.
  if (!pageContent) return;

  if (!window.supabase) {
    console.warn("Supabase library is not loaded.");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data, error } = await client
    .from("page_content")
    .select("content, is_published")
    .eq("page_key", "donate")
    .maybeSingle();

  if (error) {
    console.error("Could not load Donate page:", error.message);
    return;
  }

  const unavailable = document.querySelector("#donate-unavailable");

  if (!data || !data.is_published) {
    pageContent.hidden = true;
    if (unavailable) unavailable.hidden = false;
    return;
  }

  const content = data.content || {};

  // Page title
  const title = document.querySelector("#donate-page-title");
  if (title) title.textContent = content.title || "";

  // Banner image
  const banner = document.querySelector("#donate-banner-image");
  if (banner && content.banner_url) {
    banner.src = content.banner_url;
  }

  // Intro text
  const intro = document.querySelector("#donate-intro");
  if (intro) intro.textContent = content.intro || "";

  // Editable content blocks
  const blocksContainer = document.querySelector("#donate-blocks");

  if (blocksContainer) {
    blocksContainer.innerHTML = "";

    (content.blocks || []).forEach((block) => {
      const tag =
        block.type === "heading" ? "h2" :
        block.type === "subheading" ? "h3" : "p";

      const element = document.createElement(tag);
      element.textContent = block.text || "";
      blocksContainer.appendChild(element);
    });
  }

  // Mail a Check section
  const mail = content.mail || {};
  const mailSection = document.querySelector("#donate-mail-section");
  const mailHeading = document.querySelector("#donate-mail-heading");
  const mailMessage = document.querySelector("#donate-mail-message");
  const mailRecipient = document.querySelector("#donate-mail-recipient");
  const mailAddress = document.querySelector("#donate-mail-address");

  if (mailHeading) mailHeading.textContent = mail.heading || "";
  if (mailMessage) mailMessage.textContent = mail.message || "";
  if (mailRecipient) mailRecipient.textContent = mail.recipient || "";

  if (mailAddress) {
    mailAddress.textContent = mail.address || "";
    mailAddress.style.whiteSpace = "pre-line";
  }

  if (mailSection) {
    mailSection.hidden = !(
      mail.heading || mail.message || mail.recipient || mail.address
    );
  }

  // Steer Challenge flyer
  const steer = content.steer || {};
  const steerSection = document.querySelector("#donate-steer-section");
  const steerImage = document.querySelector("#steer-challenge-image");

  if (steerImage && steer.image_url) {
    steerImage.src = steer.image_url;
  }

  if (steerSection) {
    steerSection.hidden = !steer.image_url;
  }
}

loadDonatePage();


 
// ===================================
// LOAD ABOUT US PAGE CONTENT
// ===================================

async function loadAboutPage() {
  const pageContent = document.querySelector("#about-page-content");

  // Only run on the About Us page.
  if (!pageContent) return;

  if (!window.supabase) {
    console.warn("Supabase library is not loaded.");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data, error } = await client
    .from("page_content")
    .select("content, is_published")
    .eq("page_key", "about")
    .maybeSingle();

  if (error) {
    console.error("Could not load About Us page:", error.message);
    return;
  }

  const unavailable = document.querySelector("#about-unavailable");

  if (!data || !data.is_published) {
    pageContent.hidden = true;
    if (unavailable) unavailable.hidden = false;
    return;
  }

  const content = data.content || {};

  // Page title
  const title = document.querySelector("#about-page-title");
  if (title) title.textContent = content.title || "";

  // Banner image
  const banner = document.querySelector("#about-banner-image");
  if (banner && content.banner_url) {
    banner.src = content.banner_url;
  }

  // Content blocks
  const blocksContainer = document.querySelector("#about-content-blocks");

  if (blocksContainer) {
    blocksContainer.replaceChildren();

    (content.blocks || []).forEach((block) => {
      let element;

      if (block.type === "heading") {
        element = document.createElement("h2");
      } else if (block.type === "quote") {
        element = document.createElement("blockquote");

        element.textContent = block.text || "";

        if (block.attribution) {
          const citation = document.createElement("cite");
          citation.textContent = block.attribution;
          element.appendChild(citation);
        }
      } else {
        element = document.createElement("p");
      }

      if (block.type !== "quote") {
        element.textContent = block.text || "";
      }

      blocksContainer.appendChild(element);
    });
  }

}

loadAboutPage();


// ===================================
// LOAD SHARED FOOTER & SOCIAL SETTINGS
// ===================================

async function loadSiteSettings() {
  const socialLinks = document.querySelector("#site-social-links");
  const footer = document.querySelector("#site-footer");

  // Only run on pages that contain the shared footer.
  if (!socialLinks || !footer) return;

  if (!window.supabase) {
    console.warn("Supabase library is not loaded.");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data, error } = await client
    .from("page_content")
    .select("content, is_published")
    .eq("page_key", "site_settings")
    .maybeSingle();

  if (error) {
    console.error("Could not load footer settings:", error.message);
    return;
  }

  if (!data || !data.is_published) return;

  const content = data.content || {};
  const settings = content.footer || {};

  // Social heading
  const socialHeading = socialLinks.querySelector("p");
  if (socialHeading) {
    socialHeading.textContent = content.social_heading || "";
  }

  // Instagram
  const instagram = document.querySelector("#instagram-link");
  if (instagram) {
    instagram.href = content.instagram_url || "#";
    instagram.hidden = !content.instagram_url;
  }

  // Facebook
  const facebook = document.querySelector("#facebook-link");
  if (facebook) {
    facebook.href = content.facebook_url || "#";
    facebook.hidden = !content.facebook_url;
  }

  // Footer text
  const setText = (id, value) => {
    const element = document.querySelector(id);
    if (element) element.textContent = value || "";
  };

  setText("#footer-name", settings.organization);
  setText("#footer-tagline", settings.tagline);
  setText("#footer-address", settings.address);
  setText("#footer-tax-info", settings.tax_status);
  setText("#footer-program-info", settings.donation_statement);
  setText("#footer-copyright", settings.copyright);

  // Email
  const email = document.querySelector("#footer-email");
  if (email) {
    email.textContent = settings.email || "";
    email.href = settings.email ? `mailto:${settings.email}` : "#";
  }

  // Phone
  const phone = document.querySelector("#footer-phone");
  if (phone) {
    phone.textContent = settings.phone || "";
    phone.href = settings.phone
      ? `tel:${settings.phone.replace(/[^0-9+]/g, "")}`
      : "#";
  }

  // Website
  const website = document.querySelector("#footer-website");
  if (website) {
    website.textContent = settings.website || "";
    website.href = settings.website || "#";
  }
}

loadSiteSettings();

// ===================================
// EVENTS STEER CHALLENGE IMAGE
// ===================================

async function loadEventsSteerImage() {
  const section = document.querySelector("#events-steer-section");
  const image = document.querySelector("#events-steer-image");

  if (!section || !image) return;

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data, error } = await client
    .from("page_content")
    .select("content, is_published")
    .eq("page_key", "events_steer")
    .maybeSingle();

  if (error) {
    console.error("Could not load Steer Challenge image:", error);
    return;
  }

  const imageUrl = data?.content?.image_url;

  if (!data || !data.is_published || !imageUrl) {
    section.hidden = true;
    return;
  }

  image.src = imageUrl;
  section.hidden = false;
}

loadEventsSteerImage();