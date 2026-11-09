
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

// Replace these two values with your own Supabase information.
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
    return;
  }

  // Keep the existing event displayed if the database is empty.
  if (!events || events.length === 0) return;

  eventsList.innerHTML = "";

  events.forEach((event) => {
    const card = document.createElement("section");
    card.className = "event-card";

    const addText = (tag, className, value) => {
      if (!value) return;

      const element = document.createElement(tag);
      element.className = className;
      element.textContent = value;
      card.appendChild(element);
    };

    addText("p", "event-label", "UPCOMING EVENT");

    if (event.image_url) {
      const image = document.createElement("img");
      image.src = event.image_url;
      image.alt = event.title;
      image.className = "event-image";
      card.appendChild(image);
    }

    addText("h2", "", event.title);

    if (event.event_date) {
      const date = new Date(event.event_date + "T12:00:00");

      addText(
        "p",
        "event-day",
        date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        })
      );
    }

    addText("p", "event-time", event.event_time);
    addText("p", "event-location", event.location);
    addText("p", "event-description", event.description);

    if (event.registration_url) {
      const link = document.createElement("a");
      link.href = event.registration_url;
      link.className = "donate-button";
      link.textContent = "Learn More / Register";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.appendChild(link);
    }

    eventsList.appendChild(card);
  });
}

loadEvents();

