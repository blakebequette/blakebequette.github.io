const timeZero = new Date().getTime()
const timeNow = () => new Date().getTime()
const relTime = () => timeNow() - timeZero


let totalDist = 0;
let score = 0;
let scoreLabel = document.getElementById('score');
let statistics = document.getElementById('statistics');
let speedRatio = 0;

let body = document.getElementsByTagName('body')[0];

// body.style.backgroundColor = "green"
document.body.style.backgroundColor = "tan"; 


let cordinateLabel = document.getElementById('coords');
document.body.addEventListener("mousemove", (event) => {  
    let deltaDist = Math.sqrt(event.movementX**2 + event.movementY**2);
    totalDist += deltaDist;
    cordinateLabel.textContent = `time: ${relTime()} x: ${event.x}, y: ${window.innerHeight - event.y}`
    speedRatio = Math.floor(totalDist) / Number(relTime())
    statistics.textContent = `Mouse path distance: ${Math.floor(totalDist)}, Speed Factor: ${speedRatio.toPrecision(3)}`
})

let holes = [...document.getElementsByClassName("hole")]
console.log(holes)


setInterval(function () {
    const randomHoleIndex = Math.floor(Math.random() * holes.length);
    holes[randomHoleIndex].classList.toggle('mole');
  }, 300);

const gameArea = document.getElementById('whack-a-mole');
gameArea.addEventListener('click', function(clickEvent) {
  if (clickEvent.target.matches('.mole')) {
    // we hit a mole!
    score += 1
    clickEvent.target.classList.toggle('mole')
    scoreLabel.textContent = score; 
  }
});