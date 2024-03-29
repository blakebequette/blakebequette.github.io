const projectList = [
    {
        projectName: "Coffee Clicker",
        description: "Vanilla DOM brute force clicking game",
        thumbnail: "https://i.postimg.cc/dVWNYrCv/coffee-Clicker.png",
        entry: "/projects/coffeeClicker/index.html"
    },
    {
        projectName: "Around the World: Leaflet",
        description: "Mapping the first circumnavigation via plane, using React and Leaflet",
        thumbnail: "https://i.ibb.co/Pj0MgF6/leaflet-pic.png",
        entry: "projects/mapfun/index.html"
    },
    {
        projectName: "Traveling Salesman",
        description: "Visualizing the TS Problem using React-Leaflet",
        thumbnail: "https://i.ibb.co/FhGSx2d/tsp-v2.png",
        entry: "projects/tsp/index.html"
    },
    {
        projectName: "Campus Manager",
        description: "CRUD application. Front end: React & Redux, Back end: Express + Postgres",
        thumbnail: "https://i.postimg.cc/MTJ72p9q/campus-Manager.png",
        entry: "https://youtu.be/csAtX-6leZw"
    },
    {
        projectName: "JSON Viewer",
        description: "Drag & Drop a .json file to inspect via an interactive outline. Made with React.",
        thumbnail: "https://i.ibb.co/yPxC3jX/json-Viewer.png",
        entry: "projects/jsonViewer/index.html"
    },
    {
        projectName: "Yard Sale",
        description: "An Online Store for Ski Gear. Made with the PERN stack.",
        thumbnail: "https://i.ibb.co/0GM0sK9/shop.png",
        entry: "https://skishop.onrender.com/"
    },
    {
        projectName: "Atocha Translate",
        description: "A translation and language-learning mobile app. Built using React-Native, Expo, Docker, and Google Cloud Platform.",
        thumbnail: "https://i.ibb.co/rF8c2SH/Screen-Shot-2023-02-22-at-11-07-33-AM.png",
        entry: "https://www.youtube.com/watch?v=YCo-CrSmDi0"
    },
    {
        projectName: "Color Picker",
        description: "A theme/dark mode selector page resting on React's useContext. Easily portable to other projects.",
        thumbnail: 'https://i.ibb.co/CKdxckm/Screen-Shot-2023-03-02-at-6-09-35-PM.png',
        entry: "projects/colorPicker/index.html"
    }
]
    
// <a href="https://ibb.co/QvBsg2p"><img src="https://i.ibb.co/CKdxckm/Screen-Shot-2023-03-02-at-6-09-35-PM.png" alt="Screen-Shot-2023-03-02-at-6-09-35-PM" border="0"></a><br /><a target='_blank' href='https://imgbb.com/'>picture url</a><br />
// <a href="https://ibb.co/BcWr2xB"><img src="https://i.ibb.co/rF8c2SH/Screen-Shot-2023-02-22-at-11-07-33-AM.png" alt="Screen-Shot-2023-02-22-at-11-07-33-AM" border="0"></a><br /><a target='_blank' href='https://imgbb.com/'>upload pic</a><br />
//<a href="https://ibb.co/yQyz4pk"><img src="https://i.ibb.co/0GM0sK9/shop.png" alt="shop" border="0"></a><br /><a target='_blank' href='https://imgbb.com/'>shareable photos</a><br />
//<a href="https://ibb.co/1Q4NSWL"><img src="https://i.ibb.co/yPxC3jX/json-Viewer.png" alt="json-Viewer" border="0"></a>
// <a href="https://ibb.co/LSPD6CL"><img src="https://i.ibb.co/4WfwMj6/coffee-Clicker.png" alt="coffee-Clicker" border="0" /></a>
const insertionNode = document.getElementById("tile-insertion-point")

function project2TileNode(project){
    let newTile = document.createElement("div")
    newTile.innerText = project.projectName
    newTile.className = "tile flxd"
    newTile.innerHTML = `
        <img src='${project.thumbnail}' alt='' class='thumbnail' />
        <h4 class="project-title">${project.projectName}</h4>
        <p class="project-description">${project.description}</p>`
    newTile.addEventListener("click", ()=> {
        if (project.projectName === "Campus Manager - CRUD App") {
            window.location = project.entry
        } else {
            window.location = `${project.entry}`
        }
    })
    return newTile
}

projectList.map(project => {
    let newTile = project2TileNode(project)
    insertionNode.appendChild(newTile)
})