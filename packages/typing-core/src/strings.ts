import { Language } from "@oxytype/schemas/languages";

/**
 * Removes accents from a string.
 * https://ricardometring.com/javascript-replace-special-characters
 * @param str The input string.
 * @returns A new string with accents removed.
 */
export function replaceSpecialChars(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

/**
 * Returns the last character of a string.
 * @param word The input string.
 * @returns The last character of the input string, or an empty string if the input is empty.
 */
export function getLastChar(word: string): string {
  if (word === undefined) return "";
  return word.charAt(word.length - 1);
}

/**
 * Replaces a character at a specific index in a string.
 * @param str The input string.
 * @param index The index at which to replace the character.
 * @param chr The character to insert at the specified index.
 * @returns A new string with the character at the specified index replaced.
 */
export function replaceCharAt(str: string, index: number, chr: string): string {
  if (index > str.length - 1) return str;
  return str.substring(0, index) + chr + str.substring(index + 1);
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param str The input string.
 * @returns A new string with the first letter of each word capitalized.
 */
export function capitalizeFirstLetterOfEachWord(str: string): string {
  return str
    .split(/ +/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/**
 * Removes the size indicator from a language string.
 * @param language The language string.
 * @returns The language string with the size indicator removed.
 */
export function removeLanguageSize(language: Language): Language {
  return language.replace(/_\d*k$/g, "") as Language;
}
