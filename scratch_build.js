const fs = require('fs');
const s = fs.readFileSync('server/services/slideVoiceoverService.js', 'utf8');

const header = '/**\n * Client-Side Slide-Wise Gujarati YouTube Script Prompt Generator\n */\n\n';

const singleIdx = s.indexOf('generateSingleSlidePrompt(slide,');
const regenIdx = s.indexOf('regenerateSingleSlidePrompt(');
const singleFn = s.substring(singleIdx, regenIdx)
  .replace('generateSingleSlidePrompt(slide,', 'export function generateSingleClientSlidePrompt(slide,')
  .replace(/this\.detectCategory/g, 'detectCategory');

const masterIdx = s.indexOf('generateMasterPromptForSlides({');
const sampleIdx = s.indexOf('generateSampleVoiceoverScript(');
const masterFn = s.substring(masterIdx, sampleIdx)
  .replace('generateMasterPromptForSlides({', 'export function generateClientSlideVoiceoverPrompt({')
  .replace(/this\.normalizeSlides/g, 'normalizeSlides')
  .replace(/this\.generateSingleSlidePrompt/g, 'generateSingleClientSlidePrompt')
  .replace(/this\.generateSampleVoiceoverScript/g, 'renderFormattedScript');

const normIdx = s.indepOf('normalizeSlides(slidesInput,');
const detectIdx = s.indexOf('detectCategory(text');
const normFn = 'function ' + s.substring(normIdx, detectIdx);

const sampleCallIdx = s.indepOf('generateVoiceoverMasterPrompt(');
const detectFn = 'function ' + s.substring(detectIdx, singleIdx);

const sampleFn = ('function ' + s.substring(sampleIdx, sampleCallIdx))
  .replace('function generateSampleVoiceoverScript(slides,', 'function renderFormattedScript(slides,')
  .replace(/this\.detectCategory/g, 'detectCategory');

const clientCode = header + singleFn + '\mû§r²Ö7FW$fâ²uÆåÆâr²æ÷&Ôfâ²uÆåÆâr²FWFV7Dfâ²uÆåÆâr²6×ÆTfã°¦g2çw&—FTf–ÆU7–æ2‚'V&Æ–2ö§2÷WF–Ç2÷6Æ–FUfö–6V÷fW$vVæW&F÷"æ§2"Â6Æ–VçD6öFRÂwWFc‚r“°¦6öç6öÆRæÆör‚t'V–ÆBWF–Ç26ö×ÆWFRÆVæwFƒ¢rÂ6Æ–VçD6öFRæÆVæwF‚“°