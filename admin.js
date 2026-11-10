
// ===================================
// SUPABASE CONNECTION
// ===================================

const SUPABASE_URL = "https://kvtwgwvycxsffysnwtqa.supabase.co";
const SUPABASE_KEY = "sb_publishable_fqv4Vy8q_iLpbwfIY34nqg_FsRof_LJ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const ADMIN_EMAIL = "combathungr@gmail.com";

// ===================================
// PAGE ELEMENTS
// ===================================

const loginSection = document.querySelector("#admin-login");
const dashboardSection = document.querySelector("#admin-dashboard");
const resetSection = document.querySelector("#reset-password-section");

const loginForm = document.querySelector("#login-form");
const resetPasswordForm = document.querySelector("#reset-password-form");
const eventForm = document.querySelector("#event-form");

const message = document.querySelector("#admin-message");
const eventsList = document.querySelector("#admin-events-list");

const forgotPasswordButton =
  document.querySelector("#forgot-password-button");

let currentSession = null;
let currentImageUrl = null;

// ===================================
// MESSAGES
// ===================================

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#b00020" : "green";
}

// ===================================
// SHOW LOGIN SCREEN
// ===================================

function showLogin() {
  loginSection.style.display = "block";
  dashboardSection.style.display = "none";
  resetSection.style.display = "none";
}

// ===================================
// FORGOT PASSWORD
// ===================================

forgotPasswordButton.addEventListener("click", async () => {
  const email = document
    .querySelector("#admin-email")
    .value.trim()
    .toLowerCase();

  if (email !== ADMIN_EMAIL) {
    showMessage(
      "Please enter the authorized admin email first.",
      true
    );
    return;
  }

  showMessage("Sending password reset email...");

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin.html`
    });

  if (error) {
    showMessage(
      "Could not send reset email: " + error.message,
      true
    );
    return;
  }

  showMessage("Password reset email sent! Check your inbox.");
});

// ===================================
// PASSWORD RECOVERY EVENT
// ===================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      currentSession = session;

      loginSection.style.display = "none";
      dashboardSection.style.display = "none";
      resetSection.style.display = "block";

      showMessage("Please create your new password.");
    }
  }
);

// ===================================
// SAVE NEW PASSWORD
// ===================================

resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword =
    document.querySelector("#new-password").value;

  const confirmPassword =
    document.querySelector("#confirm-password").value;

  if (newPassword.length < 8) {
    showMessage(
      "Your password must be at least 8 characters.",
      true
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("Your passwords do not match.", true);
    return;
  }

  showMessage("Updating your password...");

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) {
    showMessage(
      "Could not update password: " + error.message,
      true
    );
    return;
  }

  await supabaseClient.auth.signOut();

  currentSession = null;

  resetPasswordForm.reset();
  loginForm.reset();

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search
  );

  showLogin();

  showMessage(
    "Your password has been updated! You can now log in."
  );
});

// ===================================
// LOGIN
// ===================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document
    .querySelector("#admin-email")
    .value.trim()
    .toLowerCase();

  const password =
    document.querySelector("#admin-password").value;

  if (email !== ADMIN_EMAIL) {
    showMessage("This email is not authorized.", true);
    return;
  }

  showMessage("Logging in...");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  currentSession = data.session;

  await checkAdminAccess();
});

// ===================================
// CHECK ADMIN ACCESS
// ===================================

async function checkAdminAccess() {
  const { data } = await supabaseClient.auth.getUser();

  if (
    !data.user ||
    data.user.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    await supabaseClient.auth.signOut();

    currentSession = null;

    showLogin();

    showMessage(
      "You are not authorized to access this page.",
      true
    );

    return;
  }

  loginSection.style.display = "none";
  resetSection.style.display = "none";
  dashboardSection.style.display = "block";

  showMessage("Welcome to the COMBAT HUNGER administration dashboard!");

  await loadAdminEvents();
  await loadPageEditors();
}

// ===================================
// CHECK EXISTING LOGIN
// ===================================

async function checkExistingLogin() {
  if (window.location.hash.includes("type=recovery")) {
    return;
  }

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    currentSession = data.session;
    await checkAdminAccess();
  }
}

// ===================================
// DASHBOARD TABS
// ===================================

document.querySelectorAll(".admin-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((tab) => {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".admin-section").forEach((section) => {
      section.classList.remove("active");
    });

    button.classList.add("active");

    const target = document.getElementById(button.dataset.tab);

    if (target) {
      target.classList.add("active");
    }
  });
});

// ===================================
// LOAD EVENTS FOR ADMIN
// ===================================

async function loadAdminEvents() {
  eventsList.textContent = "Loading events...";

  const { data: events, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    eventsList.textContent =
      "Could not load events: " + error.message;
    return;
  }

  eventsList.replaceChildren();

  if (!events || events.length === 0) {
    eventsList.textContent = "No events have been added yet.";
    return;
  }

  events.forEach((event) => {
    const card = document.createElement("div");
    card.className = "admin-event";

    const title = document.createElement("h3");
    title.textContent = event.title;

    const date = document.createElement("p");
    date.textContent = event.event_date
      ? new Date(event.event_date + "T12:00:00")
          .toLocaleDateString()
      : "No date set";

    const status = document.createElement("p");
    status.textContent = event.is_published
      ? "Published"
      : "Hidden";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editEvent(event));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteEvent(event));

    card.append(title, date, status, editButton, deleteButton);
    eventsList.appendChild(card);
  });
}

// ===================================
// ADD OR EDIT EVENT
// ===================================

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentSession) {
    showMessage("Please log in first.", true);
    return;
  }

  const eventId = document.querySelector("#event-id").value;
  const imageFile = document.querySelector("#event-image").files[0];

  let imageUrl = currentImageUrl;

  if (imageFile) {
    showMessage("Uploading photo...");

    const fileExtension = imageFile.name.split(".").pop();

    const fileName =
      `${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("event-images")
      .upload(fileName, imageFile, {
        contentType: imageFile.type
      });

    if (uploadError) {
      showMessage(
        "Photo upload failed: " + uploadError.message,
        true
      );
      return;
    }

    const { data: urlData } = supabaseClient.storage
      .from("event-images")
      .getPublicUrl(fileName);

    imageUrl = urlData.publicUrl;
  }

  const eventData = {
    event_label:
      document.querySelector("#event-label").value.trim(),

    event_time:
      document.querySelector("#event-time").value.trim(),

    event_date:
      document.querySelector("#event-date").value || null,

    organization:
      document.querySelector("#event-organization").value.trim(),

    event_introduction:
      document.querySelector("#event-introduction").value.trim(),

    title:
      document.querySelector("#event-title").value.trim(),

    description:
      document.querySelector("#event-description").value.trim(),

    underwriting_message:
      document.querySelector("#event-underwriting").value.trim(),

    additional_details:
      document.querySelector("#event-details").value.trim(),

    location:
      document.querySelector("#event-location").value.trim(),

    image_url: imageUrl,

    registration_url:
      document.querySelector("#event-registration").value.trim(),

    is_published:
      document.querySelector("#event-published").checked,

    updated_at: new Date().toISOString()
  };

  let result;

  if (eventId) {
    result = await supabaseClient
      .from("events")
      .update(eventData)
      .eq("id", eventId);
  } else {
    result = await supabaseClient
      .from("events")
      .insert([eventData]);
  }

  if (result.error) {
    showMessage(
      "Could not save event: " + result.error.message,
      true
    );
    return;
  }

  showMessage(eventId ? "Event updated!" : "Event added!");

  resetEventForm();
  await loadAdminEvents();
});

// ===================================
// EDIT EVENT
// ===================================


function editEvent(event) {
  document.querySelector("#event-id").value = event.id;

  document.querySelector("#event-label").value =
    event.event_label || "";

  document.querySelector("#event-time").value =
    event.event_time || "";

  document.querySelector("#event-date").value =
    event.event_date || "";

  document.querySelector("#event-organization").value =
    event.organization || "";

  document.querySelector("#event-introduction").value =
    event.event_introduction || "";

  document.querySelector("#event-title").value =
    event.title || "";

  document.querySelector("#event-description").value =
    event.description || "";

  document.querySelector("#event-underwriting").value =
    event.underwriting_message || "";

  document.querySelector("#event-details").value =
    event.additional_details || "";

  document.querySelector("#event-location").value =
    event.location || "";

  document.querySelector("#event-registration").value =
    event.registration_url || "";

  document.querySelector("#event-published").checked =
    event.is_published;

  currentImageUrl = event.image_url || null;

  document.querySelector("#form-heading").textContent = "Edit Event";

  document.querySelector("#save-event-button").textContent =
    "Update Event";

  document.querySelector("#cancel-edit").style.display =
    "inline-block";

  showMessage("Editing: " + event.title);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===================================
// DELETE EVENT
// ===================================

async function deleteEvent(event) {
  const confirmed = confirm(
    `Are you sure you want to delete "${event.title}"?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("events")
    .delete()
    .eq("id", event.id);

  if (error) {
    showMessage(
      "Could not delete event: " + error.message,
      true
    );
    return;
  }

  showMessage("Event deleted.");

  await loadAdminEvents();
}

// ===================================
// RESET EVENT FORM
// ===================================

function resetEventForm() {
  eventForm.reset();

  document.querySelector("#event-id").value = "";

  document.querySelector("#form-heading").textContent =
    "Add a New Event";

  document.querySelector("#save-event-button").textContent =
    "Save Event";

  document.querySelector("#cancel-edit").style.display =
    "none";

  currentImageUrl = null;
}

document.querySelector("#cancel-edit").addEventListener("click", () => {
  resetEventForm();
  showMessage("Editing cancelled.");
});

// ===================================
// PAGE EDITOR DEFAULT CONTENT
// ===================================

const defaultAboutContent = {
  title: "About Us",
  banner_url: "combat-hunger-banner.png",
  blocks: [
    {
      type: "paragraph",
      text: "COMBAT HUNGER is a Texas 501(c)(3) nonprofit organization with one goal: to become a reliable and consistent source of high-quality beef protein for veterans receiving treatment for PTSD at Camp Hope in Houston through the PTSD Foundation of America."
    },
    {
      type: "heading",
      text: "Our Purpose"
    },
    {
      type: "paragraph",
      text: "COMBAT HUNGER was formed out of a desire to give back and a commitment to serve those who have served our country. Our mission is to raise the funding necessary to purchase and provide high-quality processed beef from Texas producers to Camp Hope in Houston, supporting veterans receiving PTSD treatment through the PTSD Foundation of America."
    },
    {
      type: "paragraph",
      text: "We connect generous donors with Texas cattle producers to establish a reliable and consistent source of beef protein for veterans."
    },
    {
      type: "heading",
      text: "Our Focus"
    },
    {
      type: "paragraph",
      text: "Our focus is on veterans receiving PTSD treatment and working toward healing at Camp Hope in Houston, Texas. We want to help provide a reliable and consistent source of high-quality beef protein to support their needs."
    },
    {
      type: "heading",
      text: "Future Goals"
    },
    {
      type: "paragraph",
      text: "Our future goal is to establish the 52 Forever Fund, a permanent fund designed to operate in perpetuity and provide a stable, dependable source of funding for the beef needed by Camp Hope."
    },
    {
      type: "paragraph",
      text: "We want to build an enduring financial foundation so Camp Hope does not have to continually devote resources to finding protein. Our goal is not simply to feed veterans today, but to help ensure they are fed tomorrow and for generations to come."
    },
    {
      type: "quote",
      text: "“It is more blessed to give than to receive.”",
      attribution: "Acts 20:35"
    }
  ]
};

const defaultDonateContent = {
  title: "Give the Gift of Hope",
  banner_url: "flag.webp",
  intro: "Every gift matters. Your generosity helps COMBAT HUNGER provide high-quality beef to veterans at Camp Hope in Houston who are working to heal from PTSD.",
  blocks: [
    {
      type: "paragraph",
      text: "We know giving an entire steer may not be possible for everyone. Whether you give $25, $100, $500, or another amount, every contribution helps support this mission."
    },
    {
      type: "paragraph",
      text: "Thank you for helping us continue Fighting Hunger. Feeding Hope."
    },
    {
      type: "heading",
      text: "Make a Difference"
    },
    {
      type: "subheading",
      text: "Donate to Change Lives"
    },
    {
      type: "paragraph",
      text: "Your support helps provide hope to veterans and gives COMBAT HUNGER the ability to continue its mission."
    }
  ],
  mail: {
    heading: "Mail a Check",
    message: "Prefer to donate by mail? Checks can be made payable to",
    recipient: "COMBAT HUNGER",
    address: "264 CR 230\nGoldthwaite, TX 76840"
  },
  steer: {
    heading: "The Steer Challenge",
    image_url: "combat-hunger-logo.png"
  }
};

const defaultSiteSettings = {
  social_heading: "Follow COMBAT HUNGER:",
  instagram_url: "https://www.instagram.com/combat.hunger/",
  facebook_url: "https://www.facebook.com/profile.php?id=61593611936450",
  footer: {
    organization: "COMBAT HUNGER",
    tagline: "To serve those who have served our nation.",
    address: "264 CR 230, Goldthwaite, Texas 76840",
    email: "combathungr@gmail.com",
    phone: "832-889-5441",
    website: "https://www.combathunger.org",
    tax_status: "COMBAT HUNGER is a 501(c)(3) nonprofit organization.",
    tax_id: "41-4616764",
    donation_statement: "$0.80 of every dollar donated goes to program services.",
    copyright: "© 2026 COMBAT HUNGER. All rights reserved."
  }
};

// ===================================
// LOAD PAGE EDITORS
// ===================================

async function loadPageEditors() {
  showMessage("Loading page content...");

  const { data, error } = await supabaseClient
    .from("page_content")
    .select("*");

  if (error) {
    showMessage(
      "Could not load page content: " + error.message,
      true
    );
    return;
  }

  const rows = {};

  (data || []).forEach((row) => {
    rows[row.page_key] = row;
  });

  const about = mergeContent(
    defaultAboutContent,
    rows.about?.content || {}
  );

  const donate = mergeContent(
    defaultDonateContent,
    rows.donate?.content || {}
  );

  const settings = mergeContent(
    defaultSiteSettings,
    rows.site_settings?.content || {}
  );

  fillAboutEditor(about, rows.about?.is_published || false);
  fillDonateEditor(donate, rows.donate?.is_published || false);
  fillSettingsEditor(
    settings,
    rows.site_settings?.is_published || false
  );
  fillEventsSteerEditor(
    rows.events_steer?.content?.image_url || ""
  );

  showMessage("Dashboard content loaded.");
}

function mergeContent(defaults, saved) {
  return {
    ...defaults,
    ...saved,
    footer: {
      ...(defaults.footer || {}),
      ...(saved.footer || {})
    },
    mail: {
      ...(defaults.mail || {}),
      ...(saved.mail || {})
    },
    steer: {
      ...(defaults.steer || {}),
      ...(saved.steer || {})
    }
  };
}

// ===================================
// ABOUT US EDITOR
// ===================================

function fillAboutEditor(content, published) {
  document.querySelector("#about-page-title").value =
    content.title || "";

  document.querySelector("#about-banner-url").value =
    content.banner_url || "";

  document.querySelector("#about-published").checked = published;

  updateImagePreview(
    "#about-banner-preview",
    content.banner_url
  );

  renderAboutBlocks(content.blocks || []);
}

function renderAboutBlocks(blocks) {
  const container = document.querySelector("#about-blocks");
  container.replaceChildren();

  blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "content-block";
    card.dataset.type = block.type;

    const typeLabel = document.createElement("strong");
    typeLabel.textContent =
      block.type === "heading" ? "Heading" :
      block.type === "quote" ? "Quote" :
      "Paragraph";

    card.appendChild(typeLabel);

    if (block.type === "heading") {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "block-text";
      input.value = block.text || "";
      input.placeholder = "Enter heading";
      card.appendChild(input);
    } else {
      const textarea = document.createElement("textarea");
      textarea.className = "block-text";
      textarea.value = block.text || "";
      textarea.placeholder = block.type === "quote"
        ? "Enter quote"
        : "Enter paragraph";
      card.appendChild(textarea);
    }

    if (block.type === "quote") {
      const attribution = document.createElement("input");
      attribution.type = "text";
      attribution.className = "block-attribution";
      attribution.value = block.attribution || "";
      attribution.placeholder = "Quote attribution";
      card.appendChild(attribution);
    }

    addBlockControls(card, container);

    container.appendChild(card);
  });
}

function addAboutBlock(type) {
  const blocks = document.querySelector("#about-blocks");
  const current = collectAboutBlocks();

  current.push({
    type,
    text: "",
    attribution: ""
  });

  renderAboutBlocks(current);
}

document.querySelector("#add-about-heading").addEventListener("click", () => {
  addAboutBlock("heading");
});

document.querySelector("#add-about-paragraph").addEventListener("click", () => {
  addAboutBlock("paragraph");
});

document.querySelector("#add-about-quote").addEventListener("click", () => {
  addAboutBlock("quote");
});

function collectAboutBlocks() {
  return Array.from(
    document.querySelectorAll("#about-blocks .content-block")
  ).map((card) => ({
    type: card.dataset.type,
    text: card.querySelector(".block-text")?.value.trim() || "",
    ...(card.dataset.type === "quote"
      ? {
          attribution:
            card.querySelector(".block-attribution")?.value.trim() || ""
        }
      : {})
  }));
}

// ===================================
// DONATE EDITOR
// ===================================

function fillDonateEditor(content, published) {
  document.querySelector("#donate-page-title").value =
    content.title || "";

  document.querySelector("#donate-banner-url").value =
    content.banner_url || "";

  document.querySelector("#donate-intro").value =
    content.intro || "";

  document.querySelector("#donate-mail-heading").value =
    content.mail?.heading || "";

  document.querySelector("#donate-mail-message").value =
    content.mail?.message || "";

  document.querySelector("#donate-mail-recipient").value =
    content.mail?.recipient || "";

  document.querySelector("#donate-mail-address").value =
    content.mail?.address || "";

  document.querySelector("#donate-steer-heading").value =
    content.steer?.heading || "";

  document.querySelector("#donate-steer-image-url").value =
    content.steer?.image_url || "";

  document.querySelector("#donate-published").checked = published;

  updateImagePreview(
    "#donate-banner-preview",
    content.banner_url
  );

  updateImagePreview(
    "#donate-steer-preview",
    content.steer?.image_url
  );

  renderDonateBlocks(content.blocks || []);
}

function renderDonateBlocks(blocks) {
  const container = document.querySelector("#donate-blocks");
  container.replaceChildren();

  blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "content-block";
    card.dataset.type = block.type;

    const typeLabel = document.createElement("strong");
    typeLabel.textContent =
      block.type === "heading" ? "Heading" :
      block.type === "subheading" ? "Subheading" :
      "Paragraph";

    card.appendChild(typeLabel);

    if (block.type === "heading" || block.type === "subheading") {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "block-text";
      input.value = block.text || "";
      input.placeholder = "Enter text";
      card.appendChild(input);
    } else {
      const textarea = document.createElement("textarea");
      textarea.className = "block-text";
      textarea.value = block.text || "";
      textarea.placeholder = "Enter paragraph";
      card.appendChild(textarea);
    }

    addBlockControls(card, container);

    container.appendChild(card);
  });
}

function addDonateBlock(type) {
  const current = collectDonateBlocks();

  current.push({
    type,
    text: ""
  });

  renderDonateBlocks(current);
}

document.querySelector("#add-donate-heading").addEventListener("click", () => {
  addDonateBlock("heading");
});

document.querySelector("#add-donate-paragraph").addEventListener("click", () => {
  addDonateBlock("paragraph");
});

function collectDonateBlocks() {
  return Array.from(
    document.querySelectorAll("#donate-blocks .content-block")
  ).map((card) => ({
    type: card.dataset.type,
    text: card.querySelector(".block-text")?.value.trim() || ""
  }));
}

// ===================================
// SHARED BLOCK CONTROLS
// ===================================

function addBlockControls(card, container) {
  const controls = document.createElement("div");
  controls.className = "editor-actions";

  const upButton = document.createElement("button");
  upButton.type = "button";
  upButton.textContent = "Move Up";

  upButton.addEventListener("click", () => {
    const previous = card.previousElementSibling;

    if (previous) {
      container.insertBefore(card, previous);
    }
  });

  const downButton = document.createElement("button");
  downButton.type = "button";
  downButton.textContent = "Move Down";

  downButton.addEventListener("click", () => {
    const next = card.nextElementSibling;

    if (next) {
      container.insertBefore(next, card);
    }
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.className = "danger-button";

  removeButton.addEventListener("click", () => {
    if (confirm("Remove this content block?")) {
      card.remove();
    }
  });

  controls.append(upButton, downButton, removeButton);
  card.appendChild(controls);
}

// ===================================
// IMAGE PREVIEWS
// ===================================

function updateImagePreview(selector, url) {
  const preview = document.querySelector(selector);

  if (url) {
    preview.src = url;
    preview.hidden = false;
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
  }
}

document.querySelector("#about-banner-url").addEventListener("input", (e) => {
  updateImagePreview("#about-banner-preview", e.target.value);
});

document.querySelector("#donate-banner-url").addEventListener("input", (e) => {
  updateImagePreview("#donate-banner-preview", e.target.value);
});

document.querySelector("#donate-steer-image-url").addEventListener("input", (e) => {
  updateImagePreview("#donate-steer-preview", e.target.value);
});

document.querySelector("#events-steer-image-url").addEventListener("input", (e) => {
  updateImagePreview("#events-steer-preview", e.target.value);
});

// ===================================
// IMAGE UPLOAD
// ===================================

async function uploadPageImage(file) {
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const fileExtension = file.name.split(".").pop();

  const fileName =
    `page-images/${crypto.randomUUID()}.${fileExtension}`;

  const { error } = await supabaseClient.storage
    .from("event-images")
    .upload(fileName, file, {
      contentType: file.type
    });

  if (error) {
    throw new Error("Image upload failed: " + error.message);
  }

  const { data } = supabaseClient.storage
    .from("event-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ===================================
// SAVE PAGE CONTENT TO SUPABASE
// ===================================

async function savePageContent(pageKey, content, published) {
  if (!currentSession) {
    showMessage("Please log in first.", true);
    return false;
  }

  const { error } = await supabaseClient
    .from("page_content")
    .upsert({
      page_key: pageKey,
      content,
      is_published: published,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "page_key"
    });

  if (error) {
    showMessage(
      "Could not save " + pageKey + ": " + error.message,
      true
    );
    return false;
  }

  return true;
}

// ===================================
// SAVE ABOUT US PAGE
// ===================================

document.querySelector("#save-about").addEventListener("click", async () => {
  try {
    showMessage("Saving About Us page...");

    let bannerUrl =
      document.querySelector("#about-banner-url").value.trim();

    const bannerFile =
      document.querySelector("#about-banner-file").files[0];

    if (bannerFile) {
      bannerUrl = await uploadPageImage(bannerFile);
    }

    const content = {
      title: document.querySelector("#about-page-title").value.trim(),
      banner_url: bannerUrl,
      blocks: collectAboutBlocks()
    };

    const saved = await savePageContent(
      "about",
      content,
      document.querySelector("#about-published").checked
    );

    if (!saved) return;

    document.querySelector("#about-banner-url").value = bannerUrl;
    document.querySelector("#about-banner-file").value = "";

    updateImagePreview("#about-banner-preview", bannerUrl);

    showMessage("About Us page saved successfully!");
  } catch (error) {
    showMessage(error.message, true);
  }
});

// ===================================
// SAVE DONATE PAGE
// ===================================

document.querySelector("#save-donate").addEventListener("click", async () => {
  try {
    showMessage("Saving Donate page...");

    let bannerUrl =
      document.querySelector("#donate-banner-url").value.trim();

    let steerImageUrl =
      document.querySelector("#donate-steer-image-url").value.trim();

    const bannerFile =
      document.querySelector("#donate-banner-file").files[0];

    const steerFile =
      document.querySelector("#donate-steer-image-file").files[0];

    if (bannerFile) {
      bannerUrl = await uploadPageImage(bannerFile);
    }

    if (steerFile) {
      steerImageUrl = await uploadPageImage(steerFile);
    }

    const content = {
      title: document.querySelector("#donate-page-title").value.trim(),
      banner_url: bannerUrl,
      intro: document.querySelector("#donate-intro").value.trim(),
      blocks: collectDonateBlocks(),

      mail: {
        heading: document.querySelector("#donate-mail-heading").value.trim(),
        message: document.querySelector("#donate-mail-message").value.trim(),
        recipient: document.querySelector("#donate-mail-recipient").value.trim(),
        address: document.querySelector("#donate-mail-address").value.trim()
      },

      steer: {
        heading: document.querySelector("#donate-steer-heading").value.trim(),
        image_url: steerImageUrl
      }
    };

    const saved = await savePageContent(
      "donate",
      content,
      document.querySelector("#donate-published").checked
    );

    if (!saved) return;

    document.querySelector("#donate-banner-url").value = bannerUrl;
    document.querySelector("#donate-steer-image-url").value = steerImageUrl;

    document.querySelector("#donate-banner-file").value = "";
    document.querySelector("#donate-steer-image-file").value = "";

    updateImagePreview("#donate-banner-preview", bannerUrl);
    updateImagePreview("#donate-steer-preview", steerImageUrl);

    showMessage("Donate page saved successfully!");
  } catch (error) {
    showMessage(error.message, true);
  }
});

// ===================================
// EVENTS STEER CHALLENGE IMAGE
// ===================================

document.querySelector("#save-events-steer").addEventListener("click", async () => {
  try {
    showMessage("Saving Steer Challenge image...");

    let imageUrl =
      document.querySelector("#events-steer-image-url").value.trim();

    const imageFile =
      document.querySelector("#events-steer-image-file").files[0];

    if (imageFile) {
      imageUrl = await uploadPageImage(imageFile);
    }

    const saved = await savePageContent(
      "events_steer",
      { image_url: imageUrl },
      true
    );

    if (!saved) return;

    document.querySelector("#events-steer-image-url").value = imageUrl;
    document.querySelector("#events-steer-image-file").value = "";

    updateImagePreview("#events-steer-preview", imageUrl);

    showMessage("Steer Challenge image saved successfully!");
  } catch (error) {
    showMessage(error.message, true);
  }
});

// ===================================
// SHARED FOOTER & SOCIAL SETTINGS
// ===================================

function fillSettingsEditor(content, published) {
  const footer = content.footer || {};

  document.querySelector("#settings-social-heading").value =
    content.social_heading || "";

  document.querySelector("#settings-instagram").value =
    content.instagram_url || "";

  document.querySelector("#settings-facebook").value =
    content.facebook_url || "";

  document.querySelector("#settings-org-name").value =
    footer.organization || "";

  document.querySelector("#settings-tagline").value =
    footer.tagline || "";

  document.querySelector("#settings-address").value =
    footer.address || "";

  document.querySelector("#settings-email").value =
    footer.email || "";

  document.querySelector("#settings-phone").value =
    footer.phone || "";

  document.querySelector("#settings-website").value =
    footer.website || "";

  document.querySelector("#settings-tax-status").value =
    footer.tax_status || "";

  document.querySelector("#settings-tax-id").value =
    footer.tax_id || "";

  document.querySelector("#settings-donation-statement").value =
    footer.donation_statement || "";

  document.querySelector("#settings-copyright").value =
    footer.copyright || "";

  document.querySelector("#settings-published").checked = published;
}

function fillEventsSteerEditor(imageUrl) {
  document.querySelector("#events-steer-image-url").value =
    imageUrl || "";

  updateImagePreview(
    "#events-steer-preview",
    imageUrl
  );
}

document.querySelector("#save-settings").addEventListener("click", async () => {
  const content = {
    social_heading:
      document.querySelector("#settings-social-heading").value.trim(),

    instagram_url:
      document.querySelector("#settings-instagram").value.trim(),

    facebook_url:
      document.querySelector("#settings-facebook").value.trim(),

    footer: {
      organization:
        document.querySelector("#settings-org-name").value.trim(),

      tagline:
        document.querySelector("#settings-tagline").value.trim(),

      address:
        document.querySelector("#settings-address").value.trim(),

      email:
        document.querySelector("#settings-email").value.trim(),

      phone:
        document.querySelector("#settings-phone").value.trim(),

      website:
        document.querySelector("#settings-website").value.trim(),

      tax_status:
        document.querySelector("#settings-tax-status").value.trim(),

      tax_id:
        document.querySelector("#settings-tax-id").value.trim(),

      donation_statement:
        document.querySelector("#settings-donation-statement").value.trim(),

      copyright:
        document.querySelector("#settings-copyright").value.trim()
    }
  };

  const saved = await savePageContent(
    "site_settings",
    content,
    document.querySelector("#settings-published").checked
  );

  if (saved) {
    showMessage("Footer and social links saved successfully!");
  }
});

// ===================================
// LOG OUT
// ===================================

document.querySelector("#logout-button").addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    currentSession = null;
    loginForm.reset();

    showLogin();

    showMessage("You have been logged out.");
  }
);

// ===================================
// START
// ===================================

checkExistingLogin();
