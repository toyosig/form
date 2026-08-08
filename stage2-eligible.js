const stage2EligibleNumbers = [
  "09078369561", // Ademola Jaiyeola
  "09131746073", // OKPE PROGRESS JOHN
  "08087673217", // Beatrice Wilfred
  "09063129942", // Christian Nwigwe
  "09168215824", // Johnson God'swill Agbor
  "07010078634", // Christian Nwigwe
  "07036395920", // Victor Ijadunminiyi (+2347036395920)
  "08144420742", // Favour Uchenna
  "09164861586", // Victoria Udeji (+234 916 486 1586)
  "09066148208", // Popoola Esther
  "09043782304", // Olawale Benjamin Omoniyi
  "08034106263", // Soga Esther Olamide
  "07066772022", // Adelure Oluwaseun
  "09133033346", // Olawore oluwashina
  "08164061776", // Nnadi Nnamdi Innocent
  "09077879259",
  "08144207242",
];

const normalizePhone = (phone) => {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    digits = "0" + digits.slice(3);
  }
  return digits;
};

const isStage2Eligible = (phone) => {
  const normalized = normalizePhone(phone);
  return stage2EligibleNumbers.includes(normalized);
};

module.exports = { stage2EligibleNumbers, normalizePhone, isStage2Eligible };
