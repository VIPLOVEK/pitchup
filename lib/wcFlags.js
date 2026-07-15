const FLAGS = {
  // 2026 World Cup teams
  'Algeria': '🇩🇿', 'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Belgium': '🇧🇪', 'Bosnia & Herzegovina': '🇧🇦', 'Brazil': '🇧🇷',
  'Canada': '🇨🇦', 'Cape Verde': '🇨🇻', 'Colombia': '🇨🇴', 'Croatia': '🇭🇷',
  'Curaçao': '🇨🇼', 'Czech Republic': '🇨🇿',
  'DR Congo': '🇨🇩', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
  'Haiti': '🇭🇹',
  'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Ivory Coast': '🇨🇮',
  'Japan': '🇯🇵', 'Jordan': '🇯🇴',
  'Mexico': '🇲🇽', 'Morocco': '🇲🇦',
  'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Nigeria': '🇳🇬', 'Norway': '🇳🇴',
  'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Portugal': '🇵🇹',
  'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳',
  'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
  'Uruguay': '🇺🇾', 'USA': '🇺🇸', 'United States': '🇺🇸', 'Uzbekistan': '🇺🇿',
  // keep extras from previous editions
  'Cameroon': '🇨🇲', 'Chile': '🇨🇱', 'Costa Rica': '🇨🇷', 'Denmark': '🇩🇰',
  'Honduras': '🇭🇳', 'Hungary': '🇭🇺', 'Italy': '🇮🇹', 'Jamaica': '🇯🇲',
  'Kenya': '🇰🇪', 'Mali': '🇲🇱', 'Peru': '🇵🇪', 'Poland': '🇵🇱',
  'Romania': '🇷🇴', 'Serbia': '🇷🇸', 'Slovakia': '🇸🇰',
  'Ukraine': '🇺🇦', 'Venezuela': '🇻🇪', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}
export function flag(team) { return FLAGS[team] || '🏳️' }

export const STAGE_LABELS = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final', third: 'Third Place', final: 'Final',
}
