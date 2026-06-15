require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Handle contact form submission
app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Please fill in all required fields." });
  }

  // Create transporter (if environment variables exist, else fall back to logger)
  const useMail = process.env.SMTP_USER &&
    process.env.SMTP_USER !== "your-email@example.com" &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS !== "your-app-password";

  if (useMail) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${name}" <${email}>`,
        to: process.env.RECEIVER_EMAIL || "sonurajsonuraj4515@gmail.com",
        subject: subject || `Portfolio Contact from ${name}`,
        html: `
          <h3>New Contact Message</h3>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Subject:</b> ${subject || "No Subject"}</p>
          <p><b>Message:</b></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      console.log(`✉️ Email successfully dispatched from ${name} (${email})`);
      return res.status(200).json({ success: true, message: "Thank you! Your message has been sent successfully." });
    } catch (error) {
      console.error("❌ Mail send error:", error.message);
      // Even if email fails, log detail and return success with warning or mock confirmation
      return res.status(500).json({ success: false, error: "Server failed to send email. Please try again later." });
    }
  } else {
    // Development sandbox mode
    console.log(`📝 [SANDBOX CONTACT] Name: ${name} | Email: ${email} | Subject: ${subject} | Message: ${message}`);
    return res.status(200).json({
      success: true,
      message: "Message received! (Running in sandbox mode - no SMTP credentials configured).",
      sandbox: true
    });
  }
});

// Fallback to index.html for single-page routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Portfolio server running in production mode at http://localhost:${PORT}`);
});
