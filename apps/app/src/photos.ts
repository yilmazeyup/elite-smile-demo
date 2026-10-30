/* eslint-disable @typescript-eslint/no-require-imports */
// Elite Smile's own pictures, all from elitesmile.nl (sources in assets/CREDITS.md).

/** The six dentists' portraits as the site shows them: 800 × 800, a lavender circle on white. */
export const TEAM_PHOTOS: Record<string, number> = {
  omar: require('../assets/team/omar.webp'),
  buthaina: require('../assets/team/buthaina.webp'),
  ayman: require('../assets/team/ayman.webp'),
  najla: require('../assets/team/najla.webp'),
  mahmoud: require('../assets/team/mahmoud.webp'),
  ahmad: require('../assets/team/ahmad.webp'),
};

/** The site's photos: its hero, the specialty pictures and a smile. */
export const PHOTOS: Record<string, number> = {
  'clinic-chair': require('../assets/photos/clinic-chair.jpg'),
  kids: require('../assets/photos/kids.jpg'),
  braces: require('../assets/photos/braces.jpg'),
  'crown-model': require('../assets/photos/crown-model.jpg'),
  smile: require('../assets/photos/smile.jpg'),
};

export const LOGO = {
  light: require('../assets/brand/logo-light.png'),
  dark: require('../assets/brand/logo-dark.png'),
};
