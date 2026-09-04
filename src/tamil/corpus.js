/**
 * Tamil word corpus for the prototype.
 *
 * This is a hand-authored starter set, NOT the shipping corpus. The real one
 * needs a few thousand entries with measured frequency bands and a clear
 * licence — see the design doc. Everything here is common, everyday vocabulary
 * chosen so the prototype can be judged on feel rather than on word supply.
 *
 *   w    the word, in Tamil
 *   en   English gloss, shown in the picture/meaning hint
 *   obj  village object this word builds, if any
 *   band frequency band — drives how many repeats an object needs
 *   cat  category, used only for level theming
 */

export const WORDS = [
  // ---- objects: these build things in the world ----
  // Only these four have artwork. The rest of the buildable vocabulary is
  // deliberately left unmapped so nothing collects into a void.
  { w: 'வீடு',    en: 'house',  obj: 'house',  band: 'veryCommon', cat: 'place'  },
  { w: 'கடை',     en: 'shop',   obj: 'shop',   band: 'common',     cat: 'place'  },
  { w: 'பள்ளி',   en: 'school', obj: 'school', band: 'common',     cat: 'place'  },
  { w: 'மரம்',    en: 'tree',   obj: 'tree',   band: 'veryCommon', cat: 'nature' },

  { w: 'படகு',    en: 'boat',   cat: 'thing' },
  { w: 'கிணறு',   en: 'well',   cat: 'place' },
  { w: 'வலை',     en: 'net',    cat: 'thing' },
  { w: 'குடிசை',  en: 'hut',    cat: 'place' },
  { w: 'பாலம்',   en: 'bridge', cat: 'place' },
  { w: 'சாலை',    en: 'road',   cat: 'place' },
  { w: 'விளக்கு', en: 'lamp',   cat: 'thing' },
  { w: 'தோட்டம்', en: 'garden', cat: 'place' },

  // ---- sea and shore ----
  { w: 'கடல்',   en: 'sea',    cat: 'nature' },
  { w: 'அலை',    en: 'wave',   cat: 'nature' },
  { w: 'மணல்',   en: 'sand',   cat: 'nature' },
  { w: 'மீன்',   en: 'fish',   cat: 'animal' },
  { w: 'நீர்',   en: 'water',  cat: 'nature' },
  { w: 'கரை',    en: 'shore',  cat: 'nature' },
  { w: 'உப்பு',  en: 'salt',   cat: 'food'   },
  { w: 'காற்று', en: 'wind',   cat: 'nature' },
  { w: 'மழை',    en: 'rain',   cat: 'nature' },
  { w: 'மலை',    en: 'hill',   cat: 'nature' },
  { w: 'ஆறு',    en: 'river',  cat: 'nature' },
  { w: 'ஏரி',    en: 'lake',   cat: 'nature' },
  { w: 'காடு',   en: 'forest', cat: 'nature' },
  { w: 'கல்',    en: 'stone',  cat: 'nature' },
  { w: 'மண்',    en: 'soil',   cat: 'nature' },
  { w: 'தீ',     en: 'fire',   cat: 'nature' },

  // ---- sky ----
  { w: 'வானம்',  en: 'sky',    cat: 'nature' },
  { w: 'நிலா',   en: 'moon',   cat: 'nature' },
  { w: 'மேகம்',  en: 'cloud',  cat: 'nature' },

  // ---- animals and birds ----
  { w: 'நாய்',    en: 'dog',      cat: 'animal' },
  { w: 'பூனை',    en: 'cat',      cat: 'animal' },
  { w: 'மாடு',    en: 'cow',      cat: 'animal' },
  { w: 'ஆடு',     en: 'goat',     cat: 'animal' },
  { w: 'யானை',    en: 'elephant', cat: 'animal' },
  { w: 'குரங்கு', en: 'monkey',   cat: 'animal' },
  { w: 'மயில்',   en: 'peacock',  cat: 'animal' },
  { w: 'காகம்',   en: 'crow',     cat: 'animal' },
  { w: 'கோழி',    en: 'hen',      cat: 'animal' },
  { w: 'பறவை',    en: 'bird',     cat: 'animal' },
  { w: 'புலி',    en: 'tiger',    cat: 'animal' },
  { w: 'எலி',     en: 'mouse',    cat: 'animal' },
  { w: 'பாம்பு',  en: 'snake',    cat: 'animal' },

  // ---- body ----
  { w: 'கை',     en: 'hand',  cat: 'body' },
  { w: 'கால்',   en: 'leg',   cat: 'body' },
  { w: 'கண்',    en: 'eye',   cat: 'body' },
  { w: 'காது',   en: 'ear',   cat: 'body' },
  { w: 'மூக்கு', en: 'nose',  cat: 'body' },
  { w: 'வாய்',   en: 'mouth', cat: 'body' },
  { w: 'தலை',    en: 'head',  cat: 'body' },
  { w: 'முடி',   en: 'hair',  cat: 'body' },
  { w: 'பல்',    en: 'tooth', cat: 'body' },
  // Concrete nouns the conversational source misses entirely. Everything the
  // curated list carries is unioned into the generated dictionary, so adding a
  // word here also makes it playable as a bonus word.
  { w: 'நகம்',   en: 'nail',     cat: 'body' },
  { w: 'விரல்',  en: 'finger',   cat: 'body' },
  { w: 'தோள்',   en: 'shoulder', cat: 'body' },
  { w: 'முதுகு', en: 'back',     cat: 'body' },
  { w: 'நெற்றி', en: 'forehead', cat: 'body' },
  { w: 'உதடு',   en: 'lip',      cat: 'body' },
  { w: 'நாக்கு', en: 'tongue',   cat: 'body' },
  { w: 'வயிறு',  en: 'stomach',  cat: 'body' },
  { w: 'எலும்பு', en: 'bone',    cat: 'body' },
  { w: 'தோல்',   en: 'skin',     cat: 'body' },

  // ---- family ----
  { w: 'அம்மா',  en: 'mother',        cat: 'family' },
  { w: 'அப்பா',  en: 'father',        cat: 'family' },
  { w: 'அக்கா',  en: 'elder sister',  cat: 'family' },
  { w: 'தம்பி',  en: 'younger brother', cat: 'family' },
  { w: 'தங்கை',  en: 'younger sister',  cat: 'family' },
  { w: 'பாட்டி', en: 'grandmother',   cat: 'family' },
  { w: 'மகன்',   en: 'son',           cat: 'family' },
  { w: 'மகள்',   en: 'daughter',      cat: 'family' },

  // ---- colours ----
  { w: 'சிவப்பு', en: 'red',    cat: 'colour' },
  { w: 'பச்சை',   en: 'green',  cat: 'colour' },
  { w: 'மஞ்சள்',  en: 'yellow', cat: 'colour' },
  { w: 'நீலம்',   en: 'blue',   cat: 'colour' },
  { w: 'கருப்பு', en: 'black',  cat: 'colour' },
  { w: 'வெள்ளை',  en: 'white',  cat: 'colour' },

  // ---- shapes ----
  { w: 'வட்டம்',  en: 'circle', cat: 'shape' },
  { w: 'சதுரம்',  en: 'square', cat: 'shape' },
  { w: 'கோடு',    en: 'line',   cat: 'shape' },

  // ---- plants and food ----
  { w: 'பழம்',   en: 'fruit',  cat: 'food'   },
  { w: 'பூ',     en: 'flower', cat: 'nature' },
  { w: 'இலை',    en: 'leaf',   cat: 'nature' },
  { w: 'விதை',   en: 'seed',   cat: 'nature' },
  { w: 'வேர்',   en: 'root',   cat: 'nature' },
  { w: 'அரிசி',  en: 'rice',   cat: 'food'   },
  { w: 'பால்',   en: 'milk',   cat: 'food'   },
  { w: 'தேன்',   en: 'honey',  cat: 'food'   },
  { w: 'மிளகு',  en: 'pepper', cat: 'food'   },
  { w: 'வாழை',   en: 'banana', cat: 'food'   },
  { w: 'மாங்காய்', en: 'mango', cat: 'food'  },

  // ---- home and things ----
  { w: 'கதவு',    en: 'door',   cat: 'thing' },
  { w: 'மேசை',    en: 'table',  cat: 'thing' },
  { w: 'படுக்கை', en: 'bed',    cat: 'thing' },
  { w: 'புத்தகம்', en: 'book',  cat: 'thing' },
  { w: 'பேனா',    en: 'pen',    cat: 'thing' },
  { w: 'சட்டி',   en: 'pot',    cat: 'thing' },
  { w: 'குடம்',   en: 'pitcher',cat: 'thing' },
  { w: 'வண்டி',   en: 'cart',   cat: 'thing' },
  { w: 'சக்கரம்', en: 'wheel',  cat: 'thing' },
  { w: 'கயிறு',   en: 'rope',   cat: 'thing' },
  { w: 'துணி',    en: 'cloth',  cat: 'thing' },
  { w: 'பை',      en: 'bag',    cat: 'thing' },

  // ---- places and people ----
  { w: 'ஊர்',    en: 'town',    cat: 'place'  },
  { w: 'தெரு',   en: 'street',  cat: 'place'  },
  { w: 'நகரம்',  en: 'city',    cat: 'place'  },
  { w: 'மனிதன்', en: 'person',  cat: 'people' },
  { w: 'பெண்',   en: 'woman',   cat: 'people' },
  { w: 'நண்பன்', en: 'friend',  cat: 'people' },

  // ---- time ----
  // ---- more everyday nouns ----
  { w: 'சாவி',   en: 'key',      cat: 'thing'  },
  { w: 'கண்ணாடி', en: 'mirror',  cat: 'thing'  },
  { w: 'சீப்பு',  en: 'comb',    cat: 'thing'  },
  { w: 'குடை',   en: 'umbrella', cat: 'thing'  },
  { w: 'செருப்பு', en: 'sandal', cat: 'thing'  },
  { w: 'சட்டை',  en: 'shirt',    cat: 'thing'  },
  { w: 'மணி',    en: 'bell',     cat: 'thing'  },
  { w: 'ஊசி',    en: 'needle',   cat: 'thing'  },
  { w: 'கத்தி',  en: 'knife',    cat: 'thing'  },
  { w: 'தட்டு',  en: 'plate',    cat: 'thing'  },
  { w: 'கிண்ணம்', en: 'bowl',    cat: 'thing'  },
  { w: 'விளக்கு', en: 'lamp',    cat: 'thing'  },
  { w: 'சுவர்',  en: 'wall',     cat: 'place'  },
  { w: 'கூரை',   en: 'roof',     cat: 'place'  },
  { w: 'படி',    en: 'step',     cat: 'place'  },
  { w: 'வயல்',   en: 'field',    cat: 'nature' },
  { w: 'புல்',   en: 'grass',    cat: 'nature' },
  { w: 'முள்',   en: 'thorn',    cat: 'nature' },
  { w: 'கிளை',   en: 'branch',   cat: 'nature' },
  { w: 'பனி',    en: 'dew',      cat: 'nature' },
  { w: 'புகை',   en: 'smoke',    cat: 'nature' },
  { w: 'சாம்பல்', en: 'ash',     cat: 'nature' },
  { w: 'குளம்',  en: 'pond',     cat: 'nature' },
  { w: 'வானவில்', en: 'rainbow', cat: 'nature' },
  { w: 'நரி',    en: 'fox',      cat: 'animal' },
  { w: 'கரடி',   en: 'bear',     cat: 'animal' },
  { w: 'மான்',   en: 'deer',     cat: 'animal' },
  { w: 'குதிரை', en: 'horse',    cat: 'animal' },
  { w: 'சிலந்தி', en: 'spider',  cat: 'animal' },
  { w: 'தவளை',   en: 'frog',     cat: 'animal' },
  { w: 'நத்தை',  en: 'snail',    cat: 'animal' },
  { w: 'இறகு',   en: 'feather',  cat: 'animal' },

  { w: 'நாள்',   en: 'day',     cat: 'time' },
  { w: 'இரவு',   en: 'night',   cat: 'time' },
  { w: 'காலை',   en: 'morning', cat: 'time' },
  { w: 'மாதம்',  en: 'month',   cat: 'time' },
  { w: 'வருடம்', en: 'year',    cat: 'time' },
];

/** Repeats needed per tier, by frequency band. Rare words must stay reachable. */
export const BANDS = {
  veryCommon: [10, 50, 120],
  common:     [6,  25, 60],
  uncommon:   [4,  12, 30],
  rare:       [2,  6,  14],
};
