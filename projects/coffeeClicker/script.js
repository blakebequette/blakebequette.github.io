/* eslint-disable no-alert */


// function specPrint(str) {
//   if (typeof str ==='string') {
//     document.getElementById("print-space").innerText = str;
//   } else {
//     document.getElementById("print-space").innerText = JSON.stringify(str)
//   }
// }
/**************
 *   SLICE 1
 **************/

function updateCoffeeView(coffeeQty) {
  document.getElementById('coffee_counter').innerText = coffeeQty;
}

function clickCoffee(data) {
  data.coffee += data.clickPower || 1; 
  updateCoffeeView(data.coffee);
  unlockProducers(data.producers, data.coffee)
  renderProducers(data)

  return data
}

/**************
 *   SLICE 2
 **************/

function unlockProducers(producers, coffeeCount) {
  producers.map(producer => {
    if (coffeeCount >= producer.price/2 && !producer.unlocked) {
      producer.unlocked = true;
    }
  })
}

function getUnlockedProducers(data) {
  return [...data.producers].filter(p => p.unlocked)
}

function makeDisplayNameFromId(id) {
  return id.replaceAll('_',' ')
                .split(' ')
                .map(w => `${w[0].toUpperCase()}${w.substring(1,)}`)
                .join(' ')
}

// You shouldn't need to edit this function-- its tests should pass once you've written makeDisplayNameFromId
function makeProducerDiv(producer) {
  const containerDiv = document.createElement('div');
  containerDiv.className = 'producer';
  const displayName = makeDisplayNameFromId(producer.id);
  const currentCost = producer.price;
  const html = `
  <div class="producer-column">
    <div class="producer-title">${displayName}</div>
    <div class="button-container">
      <button type="button" id="buy_${producer.id}">Buy</button>
      <button type="button" id="sell_${producer.id}">Sell</button>
    </div>
  </div>
  <div class="producer-column">
    <div>Quantity: ${producer.qty}</div>
    <div>Coffee/second: ${producer.cps}</div>
    <div>Cost: ${currentCost} coffee</div>
  </div>
  `;
  containerDiv.innerHTML = html;
  return containerDiv;
}

function deleteAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function renderProducers(data) {
  unlockProducers(data.producers, data.coffee) //Hardcoded! 
  let prod = getUnlockedProducers(data);
  let prodContainer = document.getElementById('producer_container');
  deleteAllChildNodes(prodContainer)
  prod.forEach(p => {
    const prodDiv = makeProducerDiv(p);
    prodContainer.appendChild(prodDiv)
  })
}
 
/**************
 *   SLICE 3
 **************/

function getProducerById(data, producerId) {
  return data.producers.find(x => x.id === producerId)
}

function canAffordProducer(data, producerId) {
  return (getProducerById(data, producerId).price <= data.coffee)
}

function updateCPSView(cps) {
  let counterView = document.getElementById('cps');
  counterView.innerText = cps
}

function updateClickPowerView(clickRate) {
  let clickPowerView = document.getElementById('click-power');
  clickPowerView.innerText = clickRate
}

function updatePrice(oldPrice) {
  return Math.floor(oldPrice * 1.25)
}

function attemptToBuyProducer(data, producerId) {
  if (!canAffordProducer(data, producerId)) return false
  let p = getProducerById(data, producerId)
  data.coffee -= p.price;
  data.totalCPS += p.cps;
  p.qty++;
  p.price = updatePrice(p.price);
  updateCPSView(data.totalCPS);
  return true

}

function atttemptToSellProducer(data, producerId) {
  let prdcr = getProducerById(data, producerId);
  if (prdcr.qty > 0) {
    prdcr.qty--; 
    data.coffee += Math.floor(prdcr.price * 0.75);
    data.totalCPS -= prdcr.cps;
    return true
  } else {
    return false
  }
}



function buyButtonClick(event, data) {
  if (event.target.tagName !== 'BUTTON') return 
  if (event.target.id.split('_')[0] !== 'buy') return  
  const prod_name = event.target.id.split('_').slice(1,).join('_')
  if (!attemptToBuyProducer(data, prod_name)) {
     window.alert("Not enough coffee!")
  } else {
    renderProducers(data);
    updateCoffeeView(data.coffee);
  }
}


function sellButtonClick(event, data) {
  if (event.target.tagName !== 'BUTTON') return
  if (event.target.id.split('_')[0] !== 'sell') return
  const prod_name = event.target.id.split('_').slice(1,).join('_');
  if (!atttemptToSellProducer(data, prod_name)) {
    window.alert("No machines to sell!")
  } else {
    updateCPSView(data.totalCPS)
    renderProducers(data)
    updateCoffeeView(data.coffee)
  }  
}

function resetUpgradeVals(data) {
  data.upgrades = {
    grinder: {cost: 1000, qty:0}, 
    extraCursor: {cost: 1000, qty:0},
    caffeinatedCursor:{cost: 10, qty:0},
  };
  data.clickPower = 1; 
}

function resetUpgradeCostsView(data){
  document.getElementById('cost-grinder').innerText = data.grinder; 
  document.getElementById('cost-extraCursor').innerText = data.extraCursors; 
  document.getElementById('cost-caffeinatedCursor').innerText = data.caffeinePrestige; 
  
}
function tryAddExtraCursors(data) {
  if (data.coffee < data.extraCursors) {
    window.alert("Not enough coffee for this upgrade!")
  } else {
    console.log(data)
    data.clickPower = Math.floor(data.clickPower * 1.2 + 2);
    updateClickPowerView(data.clickPower);
    data.coffee -= data.extraCursors;
    data.extraCursors *= 2;
    resetUpgradeCostsView(data)
    tick(data)
    
  }
}

function recomputeCPS(data){
  data.totalCPS = data.producers.reduce((acc, prod) => acc + (prod.cps * prod.qty), 0)
  updateCPSView(data.totalCPS)
}

function selectRandomAndDoubleCPS(data){
  let prods = [...data.producers].filter(p => (p.unlocked && p.qty > 0));
  const prodName = prods[Math.floor(Math.random() * prods.length)].id
  data.producers.find(k => k.id === prodName).cps *= 2
  recomputeCPS(data)
}

function tryAddGrinder(data){
  if (data.coffee < data.grinder) {
    window.alert("Not enough coffee for this upgrade!")
  } else {
    data.coffee -= data.grinder;
    data.grinder *= 10
    selectRandomAndDoubleCPS(data)
    tick(data)
  }
}

function tryAddCaffeineCursor(data) {
  if (data.coffee < data.caffeinePrestige) {
    window.alert("Not enough coffee for this upgrade!")
    return data 
  } else {
    data = defaultData;
    data.clickPower *= 10; 
    data.caffeinePrestige *= 10;
    tick(data)
  }
}

function addUpgrade(event, data){
  const upgradeType = event.target.id;
  if (data.upgrades === undefined) {
    resetUpgradeVals(data)
  }
  if (upgradeType === 'coffee-grinder'){ 
    tryAddGrinder(data)
  } else if (upgradeType === 'extra-cursors'){
    tryAddExtraCursors(data)
  } else if (upgradeType === 'caffeine-cursor') {
    tryAddCaffeineCursor(data)
  } else { 
    return 
  }
}

function tick(data) {

  data.coffee += data.totalCPS;
  
  updateCoffeeView(data.coffee);
  updateCPSView(data.totalCPS)
  renderProducers(data)

  if (data.clickPower) {updateClickPowerView(data.clickPower)}
  if (data.grinder) {resetUpgradeCostsView(data)}
}


function saveGameData(data){
  localStorage.setItem("coffeeGameSave", JSON.stringify(data))
}

/*************************
 *  Start your engines!
 *************************/

// You don't need to edit any of the code below
// But it is worth reading so you know what it does!

// So far we've just defined some functions; we haven't actually
// called any of them. Now it's time to get things moving.

// We'll begin with a check to see if we're in a web browser; if we're just running this code in node for purposes of testing, we don't want to 'start the engines'.

// How does this check work? Node gives us access to a global variable /// called `process`, but this variable is undefined in the browser. So,
// we can see if we're in node by checking to see if `process` exists.
if (typeof process === 'undefined') {
  // Get starting data from the window object
  // (This comes from data.js)
  let data = window.data 
  if (localStorage.coffeeGameSave) {
    data = JSON.parse(localStorage.coffeeGameSave)
  }

  // console.log(typeof data, data)
  // data = localStorage.getItem('coffeeGameSave')
  // console.log(typeof data, data)
  // data = loadOverwriteDataIfSavedGameExists(data)
  //resetUpgradeVals(data)
  
  // Add an event listener to the giant coffee emoji
  const bigCoffee = document.getElementById('big_coffee');
  bigCoffee.addEventListener('click', () => clickCoffee(data));

  // Add an event listener to the container that holds all of the producers
  // Pass in the browser event and our data object to the event listener
  const producerContainer = document.getElementById('producer_container');
  producerContainer.addEventListener('click', event => {
    buyButtonClick(event, data);
    sellButtonClick(event, data);
  });

  const upgradeContainer = document.getElementById('upgrade-container');
  upgradeContainer.addEventListener('click', event => {
    addUpgrade(event, data)
  });

  const resetContainer = document.getElementById('reset-container'); 
  resetContainer.addEventListener('click', () => {
    data = window.data
    tick(data)
  })

  // Call the tick function passing in the data object once per second
  setInterval(() => tick(data), 1000);
  setInterval(() => saveGameData(data), 2500)
  // setInterval(saveGameData, 3000, data)
}
// Meanwhile, if we aren't in a browser and are instead in node
// we'll need to exports the code written here so we can import and
// Don't worry if it's not clear exactly what's going on here;
// We just need this to run the tests in Mocha.
else if (process) {
  module.exports = {
    updateCoffeeView,
    clickCoffee,
    unlockProducers,
    getUnlockedProducers,
    makeDisplayNameFromId,
    makeProducerDiv,
    deleteAllChildNodes,
    renderProducers,
    updateCPSView,
    getProducerById,
    canAffordProducer,
    updatePrice,
    attemptToBuyProducer,
    atttemptToSellProducer,
    buyButtonClick,
    sellButtonClick,
    tick
  };
}


const defaultData = {
  coffee: 0,
  totalCPS: 0,
  clickPower: 1,
  producers: [
    {
      id: 'chemex',
      price: 10,
      unlocked: false,
      cps: 1,
      qty: 0
    },
    {
      id: 'french_press',
      price: 50,
      unlocked: false,
      cps: 2,
      qty: 0
    },
    {
      id: 'mr._coffee',
      price: 100,
      unlocked: false,
      cps: 5,
      qty: 0
    },
    {
      id: 'ten_cup_urn',
      price: 500,
      unlocked: false,
      cps: 10,
      qty: 0
    },
    {
      id: 'espresso_machine',
      price: 1000,
      unlocked: false,
      cps: 20,
      qty: 0
    },
    {
      id: 'ten_gallon_urn',
      price: 5000,
      unlocked: false,
      cps: 50,
      qty: 0
    },
    {
      id: 'coffeeshop',
      price: 10000,
      unlocked: false,
      cps: 75,
      qty: 0
    },
    {
      id: 'coffee_factory',
      price: 50000,
      unlocked: false,
      cps: 100,
      qty: 0
    },
    {
      id: 'coffee_fountain',
      price: 100000,
      unlocked: false,
      cps: 200,
      qty: 0
    },
    {
      id: 'coffee_river',
      price: 500000,
      unlocked: false,
      cps: 500,
      qty: 0
    },
    {
      id: 'coffee_ocean',
      price: 1000000,
      unlocked: false,
      cps: 1000,
      qty: 0
    },
    {
      id: 'coffee_planet',
      price: 5000000,
      unlocked: false,
      cps: 2000,
      qty: 0
    }
  ],
  grinder: 1000, 
  extraCursors: 1000,
  caffeinePrestige: 100000,
};