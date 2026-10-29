const fs = require('fs');
const content = fs.readFileSync('./server/services/gujaratiCleaner.js', 'utf8');

const tc2 = `નમસ્તે મિત્રો! ગાંધીનગર નાણાં વિભાગ તરફથી આંગણવાડી કાર્યકર અને તેડાગર બહેનોના માનદ વેતનમાં ઐતિહાસિક વધારો કરવાનો સત્તાવાર ઠરાવ બહાર પડ્યો છે.
હવેથી આંગણવાડી કાર્યકર બહેનોને માસિક પંદર હજાર પાંચસો રૂપિયા અને તેડાગર બહેનોને નવ હજાર રૂપિયા માનદ વેતન ચૂકવવામાં આવશે.
આ વધારો પહેલી એપ્રિલથી અમલી બનશે અને બાકી રહેલા તમામ એરિયર્સ આગામી મહિનાના પગાર સાથે સીધા બેંક ખાતામાં જમા કરવામાં આવશે.
સાથે જ મોંઘવારી ભથ્થામાં પણ ચાર ટકાનો વધારો મંજૂર કરાયો છે.`;

const gc = require('./server/services/gujaratiCleaner');

// We can isolate by testing step by step
let t = tc2;
console.log('0. Raw has periods:', t.includes('.'));
t = gc.sanitizeScriptForSpeech ? gc.sanitizeScriptForSpeech(t) : t;
console.log('1. After sanitize:', t.includes('.'));
