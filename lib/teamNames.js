const PAIRS = [
  ['Tiki Taka FC', 'Route One United'],
  ['The Galácticos', 'The Wonderwall'],
  ['Catenaccio FC', 'The Gegenpressers'],
  ['Total Football', 'Park The Bus United'],
  ['The Silky Skills', 'The Flat Backs'],
  ['Nutmeg United', 'No Touch FC'],
  ['Jumpers for Goalposts', 'Taxi for Rooney'],
  ['The Offside Trap', 'The Handballs'],
  ['Banter FC', 'The Wonderkids'],
  ['The False Nines', 'The Back Four'],
  ['The Finesse Shot FC', 'The Thunderbooters'],
  ['Golden Boot SC', 'The Howlers'],
  ['The Megs', 'The Shinpads'],
  ['Sweeper Keepers', 'The Half-Volley Boys'],
  ['The Overlap Gang', 'No Marks United'],
  ['The Bicycle Kicks', 'The Knee Sliders'],
  ['El Toro FC', 'The Dustbin Lids'],
  ['Rabona FC', 'The Hoof Merchants'],
  ['Injury Time FC', 'The Dive Masters'],
  ['One More Game FC', 'The Shirt Tuggers'],
]

export function pickTeamNames() {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)]
  // Randomly swap so either name can be Team A
  return Math.random() < 0.5
    ? { teamAName: pair[0], teamBName: pair[1] }
    : { teamAName: pair[1], teamBName: pair[0] }
}
