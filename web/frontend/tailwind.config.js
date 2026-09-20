const plugin = require("tailwindcss/plugin");

module.exports = {
    content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                gothamBlack: ["GothamBlack", "sans-serif"],
                gothamLight: ["GothamLight", "sans-serif"],
                gothamMedium: ["GothamMedium", "sans-serif"],
            },
        },
    },
    plugins: [
        plugin(function ({ addVariant }) {
            addVariant("dark", "&:is(.dark *)");
        }),
    ],
};
