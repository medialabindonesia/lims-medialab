import "dotenv/config";
import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey || apiKey === "re_xxxxxxxxx") {
    throw new Error(
      "Ganti re_xxxxxxxxx dengan API key Resend asli Anda pada RESEND_API_KEY di file .env."
    );
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_TEST_FROM?.trim() || "onboarding@resend.dev";
  const to =
    process.env.RESEND_TEST_TO?.trim() || "rafifn.a18@gmail.com";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });

  if (error) {
    throw new Error(`Resend gagal mengirim email: ${error.message}`);
  }

  console.log(`Email uji berhasil dikirim ke ${to}. Message ID: ${data?.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
