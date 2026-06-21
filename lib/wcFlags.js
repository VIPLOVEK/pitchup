const FLAGS = {
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Belgium': '🇧🇪', 'Brazil': '🇧🇷',
  'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
  'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷', 'Denmark': '🇩🇰', 'Ecuador': '🇪🇨',
  'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Ghana': '🇬🇭', 'Honduras': '🇭🇳', 'Hungary': '🇭🇺', 'Iran': '🇮🇷',
  'Italy': '🇮🇹', 'Ivory Coast': '🇨🇮', 'Jamaica': '🇯🇲', 'Japan': '🇯🇵',
  'Kenya': '🇰🇪', 'Mali': '🇲🇱', 'Mexico': '🇲🇽', 'Morocco': '🇲🇦',
  'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Nigeria': '🇳🇬', 'Panama': '🇵🇦',
  'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Poland': '🇵🇱', 'Portugal': '🇵🇹',
  'Qatar': '🇶🇦', 'Romania': '🇷🇴', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳',
  'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'South Korea': '🇰🇷', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
  'Ukraine': '🇺🇦', 'United States': '🇺🇸', 'USA': '🇺🇸', 'Uruguay': '🇺🇾',
  'Venezuela': '🇻🇪', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}
export function flag(team) { return FLAGS[team] || '🏳️' }

export const STAGE_LABELS = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final', final: 'Final',
}
