const config = {
  plugins: {
    "@csstools/postcss-global-data": {
      files: ["./src/app/tokens.css"],
    },
    "postcss-custom-media": {},
  },
};

export default config;
