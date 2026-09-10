import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";

describe("i18n key parity", () => {
  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();

  it("has the same keys in en and ar dictionaries", () => {
    const enOnly = enKeys.filter((k) => !arKeys.includes(k));
    const arOnly = arKeys.filter((k) => !enKeys.includes(k));

    expect(enOnly).toEqual([]);
    expect(arOnly).toEqual([]);
    expect(enKeys.length).toBe(arKeys.length);
  });

  it("contains all pagination keys", () => {
    for (const key of [
      "pagination_item",
      "pagination_items",
      "pagination_prev",
      "pagination_next",
      "pagination_pageOf",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all common UI keys", () => {
    for (const key of [
      "common_export",
      "common_view",
      "common_patient",
      "common_selectPatient",
      "common_patientRequired",
      "common_noFile",
      "common_retry",
      "common_resetFilters",
      "perm_deniedTitle",
      "perm_deniedDesc",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all communication option keys", () => {
    for (const key of [
      "comm_channel_sms",
      "comm_channel_email",
      "comm_channel_whatsapp",
      "comm_type_reminder",
      "comm_type_campaign",
      "comm_type_notification",
      "comm_type_survey",
      "comm_status_pending",
      "comm_status_sent",
      "comm_status_delivered",
      "comm_status_scheduled",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all campaign option keys", () => {
    for (const key of [
      "camp_create",
      "camp_drip",
      "camp_broadcast",
      "camp_afterVisit",
      "camp_chronicCare",
      "camp_manual",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all document type keys", () => {
    for (const key of [
      "docType_imaging",
      "docType_lab",
      "docType_pathology",
      "docType_consent",
      "docType_medicalRecord",
      "docType_prescription",
      "docType_other",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all consent type keys", () => {
    for (const key of [
      "consentType_treatment",
      "consentType_surgery",
      "consentType_medication",
      "consentType_research",
      "consentType_photography",
      "consentType_telehealth",
      "consentType_dataSharing",
      "consentType_insurance",
      "consentType_other",
    ]) {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
    }
  });

  it("contains all core page keys for the refactored modules", () => {
    const expectedKeys = [
      "doc_title",
      "doc_subtitle",
      "doc_searchPlaceholder",
      "doc_filterByType",
      "doc_loadError",
      "doc_empty",
      "doc_exportSuccess",
      "doc_colFile",
      "doc_colUploaded",
      "doc_uploadTrigger",
      "doc_uploading",
      "doc_uploadTitle",
      "doc_uploadDesc",
      "doc_docType",
      "doc_fileUpload",
      "doc_dropHint",
      "doc_sizeLimit",
      "doc_orUrl",
      "doc_sizeError",
      "doc_requireFile",
      "doc_uploadedSuccess",
      "doc_uploadError",
      "consent_title",
      "consent_subtitle",
      "consent_searchPlaceholder",
      "consent_filterByStatus",
      "consent_granted",
      "consent_denied",
      "consent_loadError",
      "consent_empty",
      "consent_exportSuccess",
      "consent_colType",
      "consent_colSigned",
      "consent_colDocument",
      "consent_newTrigger",
      "consent_recordTitle",
      "consent_recordDesc",
      "consent_selectType",
      "consent_documentUrl",
      "consent_grantedLabel",
      "consent_recordedSuccess",
      "consent_recordError",
      "consent_recording",
      "comm_subtitle",
      "comm_totalSent",
      "comm_pending",
      "comm_failed",
      "comm_totalMessages",
      "comm_searchPlaceholder",
      "comm_allChannels",
      "comm_allStatus",
      "comm_colChannel",
      "comm_colContent",
      "comm_colSentAt",
      "comm_empty",
      "comm_loadError",
      "comm_sendMessage",
      "comm_sendTitle",
      "comm_sendDesc",
      "comm_channel",
      "comm_messageType",
      "comm_content",
      "comm_contentPlaceholder",
      "comm_characters",
      "comm_scheduleFor",
      "comm_sendImmediately",
      "comm_fillRequired",
      "comm_sentSuccess",
      "comm_sendError",
      "comm_sending",
      "comm_send",
      "camp_title",
      "camp_subtitle",
      "camp_total",
      "camp_active",
      "camp_drafts",
      "camp_archived",
      "camp_colName",
      "camp_colTrigger",
      "camp_colCreated",
      "camp_empty",
      "camp_loadError",
      "camp_newTrigger",
      "camp_createTitle",
      "camp_createDesc",
      "camp_namePlaceholder",
      "camp_type",
      "camp_typeHelp",
      "camp_triggerType",
      "camp_triggerPlaceholder",
      "camp_noTrigger",
      "camp_triggerHelp",
      "camp_fillRequired",
      "camp_createdSuccess",
      "camp_createError",
      "camp_creating",
    ];

    for (const key of expectedKeys) {
      expect(en, `missing en key: ${key}`).toHaveProperty(key);
      expect(ar, `missing ar key: ${key}`).toHaveProperty(key);
    }
  });
});