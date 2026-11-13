import foxitLicense from 'pdfjs-dist/standard_fonts/LICENSE_FOXIT?url'
import liberationLicense from 'pdfjs-dist/standard_fonts/LICENSE_LIBERATION?url'
import font0 from 'pdfjs-dist/standard_fonts/FoxitDingbats.pfb?url'
import font1 from 'pdfjs-dist/standard_fonts/FoxitSymbol.pfb?url'
import font2 from 'pdfjs-dist/standard_fonts/FoxitFixedBoldItalic.pfb?url'
import font3 from 'pdfjs-dist/standard_fonts/FoxitFixedItalic.pfb?url'
import font4 from 'pdfjs-dist/standard_fonts/FoxitSerifItalic.pfb?url'
import font5 from 'pdfjs-dist/standard_fonts/FoxitSerifBoldItalic.pfb?url'
import font6 from 'pdfjs-dist/standard_fonts/FoxitSerifBold.pfb?url'
import font7 from 'pdfjs-dist/standard_fonts/FoxitFixed.pfb?url'
import font8 from 'pdfjs-dist/standard_fonts/FoxitSerif.pfb?url'
import font9 from 'pdfjs-dist/standard_fonts/FoxitFixedBold.pfb?url'
import font10 from 'pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf?url'
import font11 from 'pdfjs-dist/standard_fonts/LiberationSans-BoldItalic.ttf?url'
import font12 from 'pdfjs-dist/standard_fonts/LiberationSans-Italic.ttf?url'
import font13 from 'pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf?url'
const fonts: Readonly<Record<string, string>> = {
  LICENSE_FOXIT: foxitLicense,
  LICENSE_LIBERATION: liberationLicense,
  'FoxitDingbats.pfb': font0,
  'FoxitSymbol.pfb': font1,
  'FoxitFixedBoldItalic.pfb': font2,
  'FoxitFixedItalic.pfb': font3,
  'FoxitSerifItalic.pfb': font4,
  'FoxitSerifBoldItalic.pfb': font5,
  'FoxitSerifBold.pfb': font6,
  'FoxitFixed.pfb': font7,
  'FoxitSerif.pfb': font8,
  'FoxitFixedBold.pfb': font9,
  'LiberationSans-Bold.ttf': font10,
  'LiberationSans-BoldItalic.ttf': font11,
  'LiberationSans-Italic.ttf': font12,
  'LiberationSans-Regular.ttf': font13,
}
export function fontUrl(filename: string): string {
  const url = Object.hasOwn(fonts, filename) ? fonts[filename] : undefined
  if (!url) throw new Error('Unsupported standard font.')
  return url
}
