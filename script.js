
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
