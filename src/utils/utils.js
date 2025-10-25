// utils.js
export const getRandomTailwindColor = () => {
  const colors = [
    { bg: "bg-red-500/50", solid: "bg-red-500", border: "border-red-500" },
    {
      bg: "bg-orange-500/50",
      solid: "bg-orange-500",
      border: "border-orange-500",
    },
    {
      bg: "bg-amber-500/50",
      solid: "bg-amber-500",
      border: "border-amber-500",
    },
    {
      bg: "bg-yellow-500/50",
      solid: "bg-yellow-500",
      border: "border-yellow-500",
    },
    { bg: "bg-lime-500/50", solid: "bg-lime-500", border: "border-lime-500" },
    {
      bg: "bg-green-500/50",
      solid: "bg-green-500",
      border: "border-green-500",
    },
    {
      bg: "bg-emerald-500/50",
      solid: "bg-emerald-500",
      border: "border-emerald-500",
    },
    { bg: "bg-teal-500/50", solid: "bg-teal-500", border: "border-teal-500" },
    { bg: "bg-cyan-500/50", solid: "bg-cyan-500", border: "border-cyan-500" },
    { bg: "bg-sky-500/50", solid: "bg-sky-500", border: "border-sky-500" },
    { bg: "bg-blue-500/50", solid: "bg-blue-500", border: "border-blue-500" },
    {
      bg: "bg-indigo-500/50",
      solid: "bg-indigo-500",
      border: "border-indigo-500",
    },
    {
      bg: "bg-violet-500/50",
      solid: "bg-violet-500",
      border: "border-violet-500",
    },
    {
      bg: "bg-purple-500/50",
      solid: "bg-purple-500",
      border: "border-purple-500",
    },
    {
      bg: "bg-fuchsia-500/50",
      solid: "bg-fuchsia-500",
      border: "border-fuchsia-500",
    },
    { bg: "bg-pink-500/50", solid: "bg-pink-500", border: "border-pink-500" },
    { bg: "bg-rose-500/50", solid: "bg-rose-500", border: "border-rose-500" },
  ];

  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
};

export const getFirstLetter = (name) => {
  if (!name || name.length === 0) return "?"; // fallback if empty
  return name.charAt(0).toUpperCase();
};
