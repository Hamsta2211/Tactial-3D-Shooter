const prefixes = ['Cyber', 'Neon', 'Shadow', 'Titan', 'Void', 'Storm', 'Iron', 'Plasma', 'Rogue', 'Zenith'];
const suffixes = ['Blade', 'Strike', 'Core', 'Pulse', 'Hunter', 'Walker', 'Drifter', 'Phantom', 'Spark', 'Knight'];

export const generateRandomName = () => {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}${Math.floor(Math.random() * 100)}`;
};
