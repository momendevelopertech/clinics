/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * G9: Medication DB + Templates + Favorites seed (idempotent).
 * - 70 medications (Egyptian market: trade + generic + strength + form)
 *   as InventoryItem(category=medication) with stock/reorder/expiry.
 * - 5 shared PrescriptionTemplates (common cases).
 * - MedicationFavorite rows for every doctor in the org.
 *
 * Usage: node scripts/seed-medications.js [orgSlug]
 * Default org: alexandria-medical-center
 */
require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// [trade/generic AR+EN, strength+form in name, sku, qty, reorder, unit]
const MEDS = [
  ["كونكور Concor 5mg أقراص (Bisoprolol)", "MED-BIS-5-TAB", 140, 40, "شريط"],
  ["كونكور Concor 10mg أقراص (Bisoprolol)", "MED-BIS-10-TAB", 110, 35, "شريط"],
  ["جلوكوفاج Glucophage 500mg أقراص (Metformin)", "MED-MET-500-TAB", 160, 50, "شريط"],
  ["جلوكوفاج Glucophage XR 1000mg ممتد (Metformin)", "MED-MET-1000-XR", 120, 40, "علبة"],
  ["أتور Ator 20mg أقراص (Atorvastatin)", "MED-ATO-20-TAB", 130, 40, "شريط"],
  ["أتور Ator 40mg أقراص (Atorvastatin)", "MED-ATO-40-TAB", 90, 30, "شريط"],
  ["زيرتك Zyrtec 10mg أقراص (Cetirizine)", "MED-CET-10-TAB", 150, 45, "شريط"],
  ["أموكسيل Amoxil 500mg كبسول (Amoxicillin)", "MED-AMX-500-CAP", 170, 55, "شريط"],
  ["أوجمنتين Augmentin 1gm أقراص (Co-Amoxiclav)", "MED-AUG-1G-TAB", 100, 30, "علبة"],
  ["أوجمنتين Augmentin 312mg شراب (Co-Amoxiclav)", "MED-AUG-312-SYP", 70, 25, "زجاجة"],
  ["بانادول Panadol 500mg أقراص (Paracetamol)", "MED-PAR-500-TAB", 300, 80, "شريط"],
  ["بانادول إكسترا Panadol Extra (Paracetamol+Caffeine)", "MED-PAN-EX", 250, 70, "شريط"],
  ["بروفين Brufen 400mg أقراص (Ibuprofen)", "MED-IBU-400-TAB", 180, 55, "شريط"],
  ["بروفين Brufen 100mg شراب (Ibuprofen)", "MED-IBU-100-SYP", 80, 25, "زجاجة"],
  ["فولتارين Voltaren 50mg أقراص (Diclofenac)", "MED-DIC-50-TAB", 140, 40, "شريط"],
  ["فولتارين Voltaren جل (Diclofenac Gel)", "MED-DIC-GEL", 90, 30, "أنبوبة"],
  ["أوميبرازول Omeprazole 20mg كبسول", "MED-OME-20-CAP", 160, 50, "شريط"],
  ["إيزوميبرازول Nexium 40mg أقراص (Esomeprazole)", "MED-ESO-40-TAB", 80, 25, "علبة"],
  ["أملوديبين Amlodipine 5mg أقراص (Norvasc)", "MED-AML-5-TAB", 130, 40, "شريط"],
  ["أملوديبين Amlodipine 10mg أقراص", "MED-AML-10-TAB", 90, 30, "شريط"],
  ["لوسارتان Losartan 50mg أقراص", "MED-LOS-50-TAB", 110, 35, "شريط"],
  ["إينالابريل Enalapril 10mg أقراص", "MED-ENA-10-TAB", 100, 30, "شريط"],
  ["أسبرين Aspirin 100mg أقراص (Aspocid)", "MED-ASP-100-TAB", 200, 60, "شريط"],
  ["بلافيكس Plavix 75mg أقراص (Clopidogrel)", "MED-CLO-75-TAB", 85, 25, "علبة"],
  ["ماريفان Marevan 3mg أقراص (Warfarin)", "MED-WAR-3-TAB", 60, 20, "علبة"],
  ["لانتوس Lantus أنسولين (Glargine)", "MED-GLA-PEN", 50, 15, "قلم"],
  ["نوفورابيد Novorapid أنسولين (Aspart)", "MED-ASP-PEN", 55, 15, "قلم"],
  ["ميكستارد Mixtard 30 أنسولين", "MED-MIX-30-VIAL", 65, 20, "زجاجة"],
  ["جانوفيا Januvia 100mg أقراص (Sitagliptin)", "MED-SIT-100-TAB", 70, 20, "علبة"],
  ["فورسيجا Forxiga 10mg أقراص (Dapagliflozin)", "MED-DAP-10-TAB", 75, 20, "علبة"],
  ["ليفوثيروكس Euthyrox 50mcg أقراص (Levothyroxine)", "MED-LEV-50-TAB", 120, 35, "علبة"],
  ["ليفوثيروكس Euthyrox 100mcg أقراص", "MED-LEV-100-TAB", 110, 35, "علبة"],
  ["فيتامين د Ossofortin D3 50000IU", "MED-VITD-50K", 140, 40, "شريط"],
  ["فيتامين د Vidrop نقط (Cholecalciferol)", "MED-VITD-DROP", 100, 30, "زجاجة"],
  ["كالسيوم Calcinate + D3 أقراص", "MED-CAL-D3", 120, 35, "علبة"],
  ["حديد Ferroglobin كبسول (Iron)", "MED-FER-CAP", 130, 40, "شريط"],
  ["حديد Haemojet أمبول (Iron)", "MED-FER-AMP", 60, 20, "أمبول"],
  ["فوليك أسيد Folic Acid 5mg أقراص", "MED-FOL-5-TAB", 150, 45, "شريط"],
  ["فيتامين ب Becozyme أقراص (B-Complex)", "MED-BEC-TAB", 140, 40, "شريط"],
  ["نيوروروبين Neurorubine أمبول (B1+B6+B12)", "MED-NEU-AMP", 90, 30, "أمبول"],
  ["أزيثرومايسين Zithromax 500mg أقراص (Azithromycin)", "MED-AZI-500-TAB", 95, 30, "علبة"],
  ["سيبروفلوكساسين Cipro 500mg أقراص (Ciprofloxacin)", "MED-CIP-500-TAB", 105, 30, "شريط"],
  ["فلاجيل Flagyl 500mg أقراص (Metronidazole)", "MED-FLA-500-TAB", 150, 45, "شريط"],
  ["فلاجيل Flagyl 125mg شراب", "MED-FLA-125-SYP", 75, 25, "زجاجة"],
  ["كيورام Curam 457mg شراب (Co-Amoxiclav)", "MED-CUR-457-SYP", 65, 20, "زجاجة"],
  ["هاي بيوتك Hibiotic 1gm أقراص", "MED-HIB-1G-TAB", 85, 25, "علبة"],
  ["أنتينال Antinal كبسول (Nifuroxazide)", "MED-ANT-CAP", 160, 50, "شريط"],
  ["أنتينال Antinal شراب", "MED-ANT-SYP", 85, 25, "زجاجة"],
  ["سميكتا Smecta أكياس (Diosmectite)", "MED-SME-SACH", 120, 35, "كيس"],
  ["موتيليوم Motilium 10mg أقراص (Domperidone)", "MED-DOM-10-TAB", 110, 35, "شريط"],
  ["جافيسكون Gaviscon شراب", "MED-GAV-SYP", 95, 30, "زجاجة"],
  ["سبازمومين Spasmomen 40mg أقراص (Otilonium)", "MED-SPA-40-TAB", 100, 30, "شريط"],
  ["بوسكوبان Buscopan 10mg أقراص (Hyoscine)", "MED-BUS-10-TAB", 130, 40, "شريط"],
  ["لوراتادين Loratadine 10mg أقراص (Claritine)", "MED-LOR-10-TAB", 150, 45, "شريط"],
  ["تلفاست Telfast 120mg أقراص (Fexofenadine)", "MED-FEX-120-TAB", 110, 35, "شريط"],
  ["فنتولين Ventolin بخاخ (Salbutamol)", "MED-VEN-INH", 80, 25, "بخاخ"],
  ["سيريتايد Seretide بخاخ (Fluticasone+Salmeterol)", "MED-SER-INH", 45, 12, "بخاخ"],
  ["أوتريفين Otrivin نقط أنف (Xylometazoline)", "MED-OTR-DROP", 140, 40, "زجاجة"],
  ["نازونكس Nasonex بخاخ أنف (Mometasone)", "MED-NAS-INH", 70, 20, "بخاخ"],
  ["أوجمنتين نقط أذن Otal نقط (Ototic)", "MED-OTA-DROP", 60, 20, "زجاجة"],
  ["توبرادكس Tobradex قطرة عين", "MED-TOB-DROP", 75, 25, "زجاجة"],
  ["سيستان Systane قطرة مرطبة", "MED-SYS-DROP", 85, 25, "زجاجة"],
  ["ديبروساليك Diprosalic مرهم", "MED-DIP-OINT", 90, 30, "أنبوبة"],
  ["فيوسيدين Fucidin كريم (Fusidic Acid)", "MED-FUC-CRM", 100, 30, "أنبوبة"],
  ["كيناكومب Kenacomb كريم", "MED-KEN-CRM", 95, 30, "أنبوبة"],
  ["ديرموفيت Dermovate كريم (Clobetasol)", "MED-DER-CRM", 70, 20, "أنبوبة"],
  ["سيتال Cetal 250mg شراب (Paracetamol)", "MED-CET-250-SYP", 110, 35, "زجاجة"],
  ["سيتال Cetal 500mg أقراص", "MED-CET-500-TAB", 200, 60, "شريط"],
  ["كتافلام Cataflam 50mg أقراص (Diclofenac K)", "MED-CAT-50-TAB", 130, 40, "شريط"],
  ["ريفو Rivo 320mg أقراص (Acetylsalicylic)", "MED-RIV-320-TAB", 90, 30, "شريط"],
  ["سولبادين Solpadeine فوار", "MED-SOL-EFF", 120, 35, "علبة"],
];

const TEMPLATES = [
  {
    name: "ضغط مرتفع — بروتوكول أولي",
    specialty: "باطنة",
    items: [
      { medicationName: "أملوديبين Amlodipine 5mg أقراص (Norvasc)", dosage: "قرص واحد", frequency: "مرة يوميًا", duration: "30 يوم", instructions: "صباحًا" },
      { medicationName: "أسبرين Aspirin 100mg أقراص (Aspocid)", dosage: "قرص واحد", frequency: "مرة يوميًا", duration: "30 يوم", instructions: "بعد الإفطار" },
    ],
  },
  {
    name: "سكر نوع 2 — متابعة",
    specialty: "باطنة",
    items: [
      { medicationName: "جلوكوفاج Glucophage 500mg أقراص (Metformin)", dosage: "قرص واحد", frequency: "مرتين يوميًا", duration: "30 يوم", instructions: "بعد الأكل" },
      { medicationName: "جانوفيا Januvia 100mg أقراص (Sitagliptin)", dosage: "قرص واحد", frequency: "مرة يوميًا", duration: "30 يوم", instructions: "صباحًا" },
    ],
  },
  {
    name: "عدوى تنفسية علوية",
    specialty: "أطفال",
    items: [
      { medicationName: "أزيثرومايسين Zithromax 500mg أقراص (Azithromycin)", dosage: "كبسولة واحدة", frequency: "مرة يوميًا", duration: "3 أيام", instructions: "قبل الأكل بساعة" },
      { medicationName: "بانادول Panadol 500mg أقراص (Paracetamol)", dosage: "قرص", frequency: "عند اللزوم", duration: "5 أيام", instructions: "عند الحرارة" },
    ],
  },
  {
    name: "ألم + التهاب",
    specialty: "عام",
    items: [
      { medicationName: "بروفين Brufen 400mg أقراص (Ibuprofen)", dosage: "قرص واحد", frequency: "3 مرات يوميًا", duration: "5 أيام", instructions: "بعد الأكل" },
      { medicationName: "أوميبرازول Omeprazole 20mg كبسول", dosage: "كبسولة", frequency: "مرة يوميًا", duration: "5 أيام", instructions: "قبل الإفطار" },
    ],
  },
  {
    name: "حساسية موسمية",
    specialty: "أنف وأذن",
    items: [
      { medicationName: "زيرتك Zyrtec 10mg أقراص (Cetirizine)", dosage: "قرص واحد", frequency: "مرة يوميًا مساءً", duration: "14 يوم", instructions: "مساءً" },
      { medicationName: "نازونكس Nasonex بخاخ أنف (Mometasone)", dosage: "بختان", frequency: "مرة يوميًا", duration: "14 يوم", instructions: "في كل فتحة أنف" },
    ],
  },
];

async function upsertMed(orgId, [name, sku, quantity, reorderLevel, unit]) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { organizationId: orgId, sku },
  });
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);
  if (existing) {
    return prisma.inventoryItem.update({
      where: { id: existing.id },
      data: { name, category: "medication", quantity, reorderLevel, unit, expiryDate: expiry },
    });
  }
  return prisma.inventoryItem.create({
    data: { organizationId: orgId, name, sku, category: "medication", quantity, reorderLevel, unit, expiryDate: expiry },
  });
}

async function main() {
  const slug = process.argv[2] || "alexandria-medical-center";
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new Error(`Organization not found: ${slug}`);

  let medCount = 0;
  for (const med of MEDS) {
    await upsertMed(org.id, med);
    medCount++;
  }

  const doctors = await prisma.user.findMany({
    where: { organizationId: org.id, role: "doctor", active: true },
    select: { id: true },
  });
  const authorId = doctors[0]?.id;
  let tplCount = 0;
  if (authorId) {
    for (const tpl of TEMPLATES) {
      const existing = await prisma.prescriptionTemplate.findFirst({
        where: { organizationId: org.id, name: tpl.name },
      });
      if (!existing) {
        await prisma.prescriptionTemplate.create({
          data: {
            organizationId: org.id,
            createdById: authorId,
            name: tpl.name,
            specialty: tpl.specialty,
            isShared: true,
            items: tpl.items,
          },
        });
        tplCount++;
      }
    }
    // Favorites: top-8 meds per doctor (usageCount starter).
    for (const doc of doctors) {
      for (const [name] of MEDS.slice(0, 8)) {
        await prisma.medicationFavorite.upsert({
          where: { userId_medicationName: { userId: doc.id, medicationName: name } },
          update: {},
          create: {
            organizationId: org.id,
            userId: doc.id,
            medicationName: name,
            usageCount: 1,
          },
        });
      }
    }
  }

  console.log(`seed-medications done: meds=${medCount} templatesCreated=${tplCount} doctors=${doctors.length} org=${slug}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
