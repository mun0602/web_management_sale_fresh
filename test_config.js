import('./next.config.ts').then((mod) => {
  const config = mod.default || mod;
  if (config.rewrites) {
    config.rewrites().then((res) => {
      console.log('REWRITES:', JSON.stringify(res, null, 2));
    });
  } else {
    console.log('No rewrites method found');
  }
}).catch((err) => {
  console.error(err);
});
