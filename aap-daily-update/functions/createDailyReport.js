const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { SECTIONS } = require('./constants/sections');
const { formatInTimeZone } = require('date-fns-tz');

const TIMEZONE = 'America/Detroit';

exports.createDailyReport = onSchedule(
  {
    schedule: '0 0 * * *',   // midnight every day
    timeZone: TIMEZONE,
  },
  async () => {
    const db = getFirestore();
    const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');

    const reportRef = db.doc(`reports/${today}`);
    const existing = await reportRef.get();

    if (existing.exists) {
      console.log(`Report for ${today} already exists, skipping.`);
      return;
    }

    const batch = db.batch();

    batch.set(reportRef, {
      createdAt: FieldValue.serverTimestamp(),
      emailSentAt: null,
      lockedAt: null,
      reportDate: today,
    });

    for (const section of SECTIONS) {
      const sectionRef = db.doc(`reports/${today}/sections/${section.id}`);
      batch.set(sectionRef, {
        sectionId: section.id,
        sectionType: section.sectionType,
        responsible: section.responsible,
        measurable: section.measurable,
        sortOrder: section.sortOrder,
        status: '',
        comments: '',
        subTableData: [],
        lastEditedBy: null,
        lastEditedAt: null,
      });
    }

    await batch.commit();
    console.log(`Successfully created daily report for ${today}`);
  }
);
