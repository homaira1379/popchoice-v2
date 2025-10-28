// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0b1630",
        navyCard: "#0f1d3b",
        limeBtn: "#29d365",
        limeBtnHover: "#20b857",
      },
      boxShadow: {
        card: "0 20px 60px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};
