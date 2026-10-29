function cleanAcronymDots(text) {
  let res = text;
  // 1. Remove dots between letters: જી.એસ.એસ.એસ.બી. -> જીએસએસએસબી
  res = res.replace(/([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\.(?=[A-Za-z\u0A80-\u0AFF\u0900-\u097F])/g, '$1');
  // 2. Remove trailing dot after acronym if followed by word: જીએસએસએસબી. દ્વારા -> જીએસએસએસબી દ્વારા
  res = res.replace(/([A-Za-z\u0A80-\u0AFF\u0900-\u097F]{2,8})\.(?=\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F])/g, '$1');
  return res;
}

const raw = 'ગુજરાત ગૌણ સેવા પસંદગી મંડળ એટલે કે જી.એસ.એસ.એસ.બી. દ્વારા ક્લાર્ક અને હેડ ક્લાર્કની નવી ભરતી ૨૦૨૬ માટે સત્તાવાર જાહેરાત પ્રસિદ્ધ કરવામાં આવી છે.';
console.log('Fixed acronym dots:', cleanAcronymDots(raw));
