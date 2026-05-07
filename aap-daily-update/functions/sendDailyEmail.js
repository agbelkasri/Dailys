const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { defineString } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer');
const { formatInTimeZone } = require('date-fns-tz');
const { generateReportHTML } = require('./emailTemplate');

const TIMEZONE = 'America/Detroit';
const SENDGRID_API_KEY = defineString('SENDGRID_API_KEY');
const EMAIL_FROM = defineString('EMAIL_FROM', { default: 'dailyreport@yourcompany.com' });

exports.sendDailyEmail = onSchedule(
  {
    schedule: '0 17 * * *',   // 5:00 PM every day
    timeZone: TIMEZONE,
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');

    // Get distribution list from Firestore config
    const configSnap = await db.doc('config/emailSettings').get();
    if (!configSnap.exists) {
      console.error('config/emailSettings not found — cannot send email');
      return;
    }
    const { recipients } = configSnap.data();
    if (!recipients?.length) {
      console.error('No recipients configured in config/emailSettings');
      return;
    }

    // Check if already sent today
    const reportSnap = await db.doc(`reports/${today}`).get();
    if (reportSnap.exists && reportSnap.data().emailSentAt) {
      console.log(`Email already sent for ${today}, skipping.`);
      return;
    }

    // Fetch all sections ordered by sortOrder
    const sectionsSnap = await db
      .collection(`reports/${today}/sections`)
      .orderBy('sortOrder')
      .get();
    const sections = sectionsSnap.docs.map((d) => d.data());

    // Generate HTML
    const html = generateReportHTML(sections, today);

    // Generate PDF with Puppeteer
    let pdfBuffer;
    try {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        printBackground: true,
      });
      await browser.close();
    } catch (err) {
      console.error('Puppeteer PDF generation failed:', err);
      // Send email without PDF attachment as fallback
      pdfBuffer = null;
    }

    // Send via SendGrid
    sgMail.setApiKey(SENDGRID_API_KEY.value());

    const msg = {
      to: recipients,
      from: EMAIL_FROM.value(),
      subject: `GAP Daily Update - ${today}`,
      html,
    };

    if (pdfBuffer) {
      msg.attachments = [
        {
          content: Buffer.from(pdfBuffer).toString('base64'),
          filename: `GAP-Daily-Update-${today}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];
    }

    await sgMail.send(msg);
    console.log(`Daily report email sent for ${today} to ${recipients.length} recipients`);

    // Mark report as emailed and lock it from further edits
    await db.doc(`reports/${today}`).update({
      emailSentAt: FieldValue.serverTimestamp(),
      lockedAt: FieldValue.serverTimestamp(),
    });
  }
);
