const projectList = [
    {
        projectName: "Coffee Clicker",
        description: "Vanilla DOM clicking game",
        thumbnail: "./thumbnails/coffeeClicker.png",
        entry: "/projects/coffeeClicker/index.html"
    },
    {
        projectName: "Whack-A-Mole",
        description: "Vanilla DOM whack-a-mole game with some event listener improvisation",
        thumbnail: "./thumbnails/whackAMole.png",
        entry: "/projects/whackAMole/index.html"
    },
]

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
        console.log(window.location)
        window.location = window.location + `${project.entry}`
    })
    return newTile
}

projectList.map(project => {
    let newTile = project2TileNode(project)
    insertionNode.appendChild(newTile)
})