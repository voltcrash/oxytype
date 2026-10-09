//convert numbers to arabic-indic
export function convertNumberToArabic(numString: string): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  let ret = "";
  for (const char of numString) {
    ret += arabicIndic[parseInt(char)];
  }
  return ret;
}

export function convertNumberToBangla(numString: string): string {
  const banglaIndic = "০১২৩৪৫৬৭৮৯";
  let ret = "";
  for (const char of numString) {
    ret += banglaIndic[parseInt(char)];
  }
  return ret;
}

export function convertNumberToNepali(numString: string): string {
  const nepaliIndic = "०१२३४५६७८९";
  let ret = "";
  for (const char of numString) {
    ret += nepaliIndic[parseInt(char)];
  }
  return ret;
}

export function convertNumberToHindi(numString: string): string {
  const hindiIndic = "०१२३४५६७८९";
  let ret = "";
  for (const char of numString) {
    ret += hindiIndic[parseInt(char)];
  }
  return ret;
}
