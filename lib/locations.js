// Regular venues — shown as a preset dropdown when creating a poll,
// and surfaced as a map link + boot type on the poll/share page.
export const LOCATIONS = [
  {
    name: "Byrne's Ridge Park",
    boot: 'FG',
    mapUrl: 'https://maps.app.goo.gl/zKe13Jm3D8CEfBuG6',
  },
  {
    name: 'Hal and Bernie/Hanson Turf',
    boot: 'AG',
    mapUrl: 'https://maps.app.goo.gl/Z27Nxd8h2uHDnM9u8?g_st=iw',
  },
  {
    name: 'Hal and Bernie/Hanson Field 14',
    boot: 'FG',
    mapUrl: 'https://maps.app.goo.gl/6D49rVFLgwbf1Ac2A',
  },
  {
    name: 'Sully',
    boot: 'TF',
    mapUrl: 'https://maps.app.goo.gl/92SxPWD2zAbz2pXd6?g_st=ac',
  },
  {
    name: 'Moorefield',
    boot: 'FG',
    mapUrl: 'https://maps.app.goo.gl/MhD9Khps3p3kWYWv6?g_st=iw',
  },
]

export function findLocation(name) {
  return LOCATIONS.find((l) => l.name === name)
}
