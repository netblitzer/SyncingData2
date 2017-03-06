
// function to generate random colors
const randCol = () => {
  const R = Math.round(Math.random() * 255);
  const G = Math.round(Math.random() * 255);
  const B = Math.round(Math.random() * 255);

  return `rgb(${R}, ${G}, ${B})`;
};

// function to generate random names
const randName = () => {
  const time = new Date();

  return `User${Math.round(time.getTime() * Math.random()) % 10000000}`;
};

// function to generate random room names
const randRoomName = () => {
  const time = new Date();
  return `Room${Math.round(time.getTime()) % 10000000}`;
};


// Export the functions
module.exports = {
  randCol,
  randName,
  randRoomName,
};
