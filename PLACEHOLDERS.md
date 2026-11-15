# Before ALING goes live

## Must do

1. **WhatsApp invite link**: in `js/config.js`, set `WHATSAPP_LINK`. Every join button uses it. Until then the buttons open a dummy link.

2. **Do not upload `_originals/`**. It holds the unedited testimonial screenshots, which show members' phone numbers and a private meeting link. The copies used on the page (`assets/testimonials/`) have those covered. Leave `_originals/` and `ALING_LOGO/` out when you deploy (`ALING_LOGO/` holds the full-size logo and founder photo; the page uses smaller copies in `assets/img/`).

3. **Members' permission**: the page shows names and messages from Jacob Joy, Abdul Aliyu and Michael Dominick O.S. Check each is happy to be featured.

## Should confirm

4. **Call timezone**: in `js/config.js`, set `TIMEZONE_LABEL` (for example `WAT`) so "8:00 PM" is unambiguous, and `TIMEZONE` (for example `Africa/Lagos`) so "Today is..." follows the community's clock instead of each visitor's. Both are currently empty.

5. **Founder section**: it names Unyime Uko as founder (taken from Jacob Joy's LinkedIn comment), shows the founder photo and uses the mission statement as the text. A few lines in the founder's own words would be stronger; replace the two paragraphs in `founder__note` in `index.html`.

6. **Copy check**: the FAQ answers and the "for you / not for you" lists are drafted from the ALING bio. Read them once and adjust anything that doesn't match how the community runs.

## Adding more testimonials

Copy one `<article class="chat">` block in `index.html`, point both the `data-zoom` and `src` at the new image in `assets/testimonials/`, and type the quote exactly as the member wrote it. Cover phone numbers in the screenshot first.

## Running it locally

Open a terminal in this folder and run `npx serve`, then open the address it prints.
